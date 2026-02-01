-- Production Rollout Migration
-- New pricing structure: A La Carte + Subscription Plans

-- Create pricing type enum
CREATE TYPE pricing_type AS ENUM ('one_time', 'subscription');
CREATE TYPE subscription_tier AS ENUM ('starter', 'growth', 'premium');

-- Create products table for all pricing options
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  pricing_type pricing_type NOT NULL DEFAULT 'one_time',
  price_sgd DECIMAL(10, 2) NOT NULL,
  price_sgd_max DECIMAL(10, 2), -- For range pricing (e.g., $15-20)
  images_included INTEGER NOT NULL DEFAULT 1,
  stripe_price_id TEXT UNIQUE,
  stripe_product_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  tier subscription_tier NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, past_due, paused
  images_per_month INTEGER NOT NULL,
  images_used_this_month INTEGER DEFAULT 0,
  rollover_images INTEGER DEFAULT 0, -- Max 5 rollover
  social_posts_per_month INTEGER DEFAULT 0,
  social_posts_used_this_month INTEGER DEFAULT 0,
  has_priority_turnaround BOOLEAN DEFAULT false,
  has_free_reedits BOOLEAN DEFAULT false,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create one-time purchases table (for A La Carte)
CREATE TABLE IF NOT EXISTS one_time_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  images_purchased INTEGER NOT NULL,
  images_remaining INTEGER NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'sgd',
  status TEXT NOT NULL DEFAULT 'completed',
  expires_at TIMESTAMPTZ, -- Optional expiry for purchased images
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user_id
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint
  ON rate_limits(identifier, endpoint, window_start);

-- Create webhook events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB,
  status TEXT DEFAULT 'processed'
);

-- Insert A La Carte products (SGD pricing)
INSERT INTO products (name, description, pricing_type, price_sgd, price_sgd_max, images_included, sort_order, metadata) VALUES
  ('Single Image Enhancement', 'Professional enhancement for one dish photo', 'one_time', 15.00, 20.00, 1, 1, '{"category": "a_la_carte"}'),
  ('5-Image Pack', 'Perfect for small menu updates', 'one_time', 60.00, 75.00, 5, 2, '{"category": "a_la_carte", "savings_percent": 20}'),
  ('10-Image Pack', 'Ideal for seasonal menu refresh', 'one_time', 100.00, 120.00, 10, 3, '{"category": "a_la_carte", "savings_percent": 33}'),
  ('Full Menu Makeover', 'Complete menu transformation (up to 30 images)', 'one_time', 250.00, 300.00, 30, 4, '{"category": "a_la_carte", "popular": true}'),
  ('GrabFood/Deliveroo Listing', 'Delivery platform optimization (up to 20 images)', 'one_time', 180.00, 200.00, 20, 5, '{"category": "a_la_carte", "platforms": ["grabfood", "deliveroo", "foodpanda"]}');

-- Insert Subscription products (SGD monthly pricing)
INSERT INTO products (name, description, pricing_type, price_sgd, price_sgd_max, images_included, sort_order, metadata) VALUES
  ('Starter Plan', '10 enhanced images per month', 'subscription', 80.00, 100.00, 10, 10, '{"category": "subscription", "tier": "starter", "social_posts": 0, "priority": false}'),
  ('Growth Plan', '20 enhanced images + 2 social posts per month', 'subscription', 150.00, 180.00, 20, 11, '{"category": "subscription", "tier": "growth", "social_posts": 2, "priority": false, "popular": true}'),
  ('Premium Plan', '40 images + 4 social posts + priority turnaround', 'subscription', 280.00, 350.00, 40, 12, '{"category": "subscription", "tier": "premium", "social_posts": 4, "priority": true}');

-- Create function to check and update subscription usage
CREATE OR REPLACE FUNCTION check_subscription_usage(p_user_id UUID)
RETURNS TABLE (
  can_enhance BOOLEAN,
  images_remaining INTEGER,
  is_priority BOOLEAN,
  subscription_tier TEXT
) AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_total_available INTEGER;
BEGIN
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND current_period_end > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription.id IS NULL THEN
    RETURN QUERY SELECT false, 0, false, NULL::TEXT;
    RETURN;
  END IF;

  v_total_available := v_subscription.images_per_month - v_subscription.images_used_this_month + v_subscription.rollover_images;

  RETURN QUERY SELECT
    v_total_available > 0,
    v_total_available,
    v_subscription.has_priority_turnaround,
    v_subscription.tier::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to consume subscription image
CREATE OR REPLACE FUNCTION consume_subscription_image(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND current_period_end > NOW()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_subscription.id IS NULL THEN
    RETURN false;
  END IF;

  -- First use rollover, then current month allocation
  IF v_subscription.rollover_images > 0 THEN
    UPDATE subscriptions
    SET rollover_images = rollover_images - 1,
        updated_at = NOW()
    WHERE id = v_subscription.id;
  ELSIF v_subscription.images_used_this_month < v_subscription.images_per_month THEN
    UPDATE subscriptions
    SET images_used_this_month = images_used_this_month + 1,
        updated_at = NOW()
    WHERE id = v_subscription.id;
  ELSE
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle monthly subscription reset
CREATE OR REPLACE FUNCTION reset_monthly_subscription_usage()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET
    -- Rollover unused images (max 5)
    rollover_images = LEAST(5, images_per_month - images_used_this_month + rollover_images),
    images_used_this_month = 0,
    social_posts_used_this_month = 0,
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month',
    updated_at = NOW()
  WHERE status = 'active'
    AND current_period_end <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_minutes INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Clean old entries
  DELETE FROM rate_limits
  WHERE window_start < v_window_start;

  -- Count requests in window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;

  -- Record this request
  INSERT INTO rate_limits (identifier, endpoint, window_start)
  VALUES (p_identifier, p_endpoint, NOW());

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products (publicly readable)
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can modify products"
  ON products FOR ALL
  USING (is_admin());

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for one_time_purchases
CREATE POLICY "Users can view their own purchases"
  ON one_time_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage purchases"
  ON one_time_purchases FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for rate_limits (service role only)
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for webhook_events (service role only)
CREATE POLICY "Service role can manage webhook events"
  ON webhook_events FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON subscriptions(user_id, status, current_period_end)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_one_time_purchases_user_id ON one_time_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_one_time_purchases_user_remaining ON one_time_purchases(user_id, images_remaining)
  WHERE images_remaining > 0;
CREATE INDEX IF NOT EXISTS idx_products_pricing_type ON products(pricing_type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_active_type ON products(pricing_type, is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);

-- Atomic token update function (prevents race conditions)
CREATE OR REPLACE FUNCTION add_user_tokens(p_user_id UUID, p_tokens INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO user_tokens (user_id, tokens)
  VALUES (p_user_id, p_tokens)
  ON CONFLICT (user_id)
  DO UPDATE SET tokens = user_tokens.tokens + p_tokens,
               updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON one_time_purchases TO authenticated;
GRANT EXECUTE ON FUNCTION check_subscription_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_tokens TO service_role;
