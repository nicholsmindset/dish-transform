-- ============================================================
-- DISH TRANSFORM - COMPLETE SUPABASE SCHEMA
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)
-- Run each section in order. If a table already exists, skip it.
-- ============================================================


-- ============================================================
-- SECTION 1: STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'enhanced-photos',
  'enhanced-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view enhanced photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'enhanced-photos');

CREATE POLICY "Authenticated users can upload enhanced photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'enhanced-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own enhanced photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'enhanced-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);


-- ============================================================
-- SECTION 2: USER PROFILES (auto-created on signup)
-- ============================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  restaurant_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 3: PHOTO LIBRARY & ENHANCED PHOTOS
-- ============================================================

CREATE TABLE public.photo_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_image_url text NOT NULL,
  dish_name text,
  batch_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.photo_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos"
ON public.photo_library FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos"
ON public.photo_library FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.photo_library FOR DELETE USING (auth.uid() = user_id);

-- Enhanced photos (3 style variations per original)
CREATE TABLE public.enhanced_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_library_id uuid NOT NULL REFERENCES public.photo_library(id) ON DELETE CASCADE,
  style_name text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.enhanced_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enhanced photos of their library photos"
ON public.enhanced_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.photo_library
    WHERE photo_library.id = enhanced_photos.photo_library_id
    AND photo_library.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert enhanced photos for their library photos"
ON public.enhanced_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.photo_library
    WHERE photo_library.id = enhanced_photos.photo_library_id
    AND photo_library.user_id = auth.uid()
  )
);


-- ============================================================
-- SECTION 4: BATCH UPLOADS
-- ============================================================

CREATE TABLE public.batch_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_images integer NOT NULL,
  completed_images integer DEFAULT 0,
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.batch_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batches"
ON public.batch_uploads FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batches"
ON public.batch_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches"
ON public.batch_uploads FOR UPDATE USING (auth.uid() = user_id);


-- ============================================================
-- SECTION 5: SOCIAL MEDIA EXPORTS
-- ============================================================

CREATE TABLE public.social_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enhanced_photo_id uuid NOT NULL REFERENCES public.enhanced_photos(id) ON DELETE CASCADE,
  platform text NOT NULL,
  dimensions text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view social exports of their photos"
ON public.social_exports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enhanced_photos
    JOIN public.photo_library ON photo_library.id = enhanced_photos.photo_library_id
    WHERE enhanced_photos.id = social_exports.enhanced_photo_id
    AND photo_library.user_id = auth.uid()
  )
);


-- ============================================================
-- SECTION 6: MENU BUILDER
-- ============================================================

CREATE TABLE public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  template text DEFAULT 'grid',
  is_published boolean DEFAULT false,
  public_url text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own menus"
ON public.menus FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menus"
ON public.menus FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menus"
ON public.menus FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menus"
ON public.menus FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view published menus"
ON public.menus FOR SELECT USING (is_published = true);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  enhanced_photo_id uuid REFERENCES public.enhanced_photos(id) ON DELETE SET NULL,
  dish_name text NOT NULL,
  description text,
  price decimal(10,2),
  section text,
  position integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view menu items of their menus"
ON public.menu_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_items.menu_id AND menus.user_id = auth.uid()));

CREATE POLICY "Users can insert menu items for their menus"
ON public.menu_items FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_items.menu_id AND menus.user_id = auth.uid()));

CREATE POLICY "Users can update menu items of their menus"
ON public.menu_items FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_items.menu_id AND menus.user_id = auth.uid()));

CREATE POLICY "Users can delete menu items of their menus"
ON public.menu_items FOR DELETE
USING (EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_items.menu_id AND menus.user_id = auth.uid()));

CREATE POLICY "Anyone can view menu items of published menus"
ON public.menu_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_items.menu_id AND menus.is_published = true));


-- ============================================================
-- SECTION 7: BRAND SETTINGS
-- ============================================================

CREATE TABLE public.brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_name text,
  logo_url text,
  primary_color text DEFAULT '#ea580c',
  secondary_color text DEFAULT '#15803d',
  font_family text DEFAULT 'Inter',
  default_style text DEFAULT 'Clean White Background',
  watermark_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand settings"
ON public.brand_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand settings"
ON public.brand_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand settings"
ON public.brand_settings FOR UPDATE USING (auth.uid() = user_id);


-- ============================================================
-- SECTION 8: USER ROLES (admin/user)
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Role-checking functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- SECTION 9: SYSTEM SETTINGS (admin-configurable)
-- ============================================================

CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  category text NOT NULL, -- 'enhancement', 'storage', 'features', 'general'
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system settings"
ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert system settings"
ON public.system_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update system settings"
ON public.system_settings FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can delete system settings"
ON public.system_settings FOR DELETE TO authenticated USING (public.is_admin());

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_system_settings_timestamp
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION update_system_settings_timestamp();

-- Default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description, category) VALUES
('default_enhancement_style', '"Clean White Background"', 'Default enhancement style for new users', 'enhancement'),
('available_styles', '["Clean White Background", "Rustic Table Setting", "Dark Moody Background"]', 'Available enhancement styles', 'enhancement'),
('max_storage_per_user_mb', '5000', 'Maximum storage per user in MB (5GB default)', 'storage'),
('max_photos_per_user', '1000', 'Maximum number of photos per user (0 = unlimited)', 'storage'),
('max_batch_upload_size', '10', 'Maximum number of photos in a batch upload', 'storage'),
('feature_batch_upload', 'true', 'Enable batch upload feature', 'features'),
('feature_social_export', 'true', 'Enable social media export feature', 'features'),
('feature_menu_builder', 'true', 'Enable menu builder feature', 'features'),
('feature_brand_settings', 'true', 'Enable brand consistency settings', 'features'),
('watermark_default_enabled', 'false', 'Enable watermark by default for new users', 'general'),
('signup_enabled', 'true', 'Allow new user registrations', 'general');


-- ============================================================
-- SECTION 10: TOKEN SYSTEM (legacy, still used for credits)
-- ============================================================

CREATE TABLE public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  product_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  tokens_purchased INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(stripe_checkout_session_id)
);

CREATE TABLE public.token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_used INTEGER NOT NULL,
  photo_library_id UUID REFERENCES public.photo_library(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
  ON public.user_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tokens"
  ON public.user_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tokens"
  ON public.user_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own purchases"
  ON public.token_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchases"
  ON public.token_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own usage"
  ON public.token_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage"
  ON public.token_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all tokens"
  ON public.user_tokens FOR SELECT USING (is_admin());
CREATE POLICY "Admins can view all purchases"
  ON public.token_purchases FOR SELECT USING (is_admin());
CREATE POLICY "Admins can view all usage"
  ON public.token_usage FOR SELECT USING (is_admin());

-- Auto-update timestamp for tokens
CREATE OR REPLACE FUNCTION public.update_token_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_tokens_timestamp
  BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_token_balance();

CREATE INDEX idx_user_tokens_user_id ON public.user_tokens(user_id);
CREATE INDEX idx_token_purchases_user_id ON public.token_purchases(user_id);
CREATE INDEX idx_token_usage_user_id ON public.token_usage(user_id);
CREATE INDEX idx_token_purchases_session_id ON public.token_purchases(stripe_checkout_session_id);


-- ============================================================
-- SECTION 11: PRICING & PAYMENTS (Production)
-- ============================================================

-- Enums
CREATE TYPE pricing_type AS ENUM ('one_time', 'subscription');
CREATE TYPE subscription_tier AS ENUM ('starter', 'growth', 'premium');

-- Products table (all pricing options)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  pricing_type pricing_type NOT NULL DEFAULT 'one_time',
  price_sgd DECIMAL(10, 2) NOT NULL,
  price_sgd_max DECIMAL(10, 2),
  images_included INTEGER NOT NULL DEFAULT 1,
  stripe_price_id TEXT UNIQUE,
  stripe_product_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  tier subscription_tier NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  images_per_month INTEGER NOT NULL,
  images_used_this_month INTEGER DEFAULT 0,
  rollover_images INTEGER DEFAULT 0,
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

-- One-time purchases (A La Carte)
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
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint
  ON rate_limits(identifier, endpoint, window_start);

-- Webhook events (idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB,
  status TEXT DEFAULT 'processed'
);

-- Seed A La Carte products
INSERT INTO products (name, description, pricing_type, price_sgd, price_sgd_max, images_included, sort_order, metadata) VALUES
  ('Single Image Enhancement', 'Professional enhancement for one dish photo', 'one_time', 15.00, 20.00, 1, 1, '{"category": "a_la_carte"}'),
  ('5-Image Pack', 'Perfect for small menu updates', 'one_time', 60.00, 75.00, 5, 2, '{"category": "a_la_carte", "savings_percent": 20}'),
  ('10-Image Pack', 'Ideal for seasonal menu refresh', 'one_time', 100.00, 120.00, 10, 3, '{"category": "a_la_carte", "savings_percent": 33}'),
  ('Full Menu Makeover', 'Complete menu transformation (up to 30 images)', 'one_time', 250.00, 300.00, 30, 4, '{"category": "a_la_carte", "popular": true}'),
  ('GrabFood/Deliveroo Listing', 'Delivery platform optimization (up to 20 images)', 'one_time', 180.00, 200.00, 20, 5, '{"category": "a_la_carte", "platforms": ["grabfood", "deliveroo", "foodpanda"]}');

-- Seed Subscription products
INSERT INTO products (name, description, pricing_type, price_sgd, price_sgd_max, images_included, sort_order, metadata) VALUES
  ('Starter Plan', '10 enhanced images per month', 'subscription', 80.00, 100.00, 10, 10, '{"category": "subscription", "tier": "starter", "social_posts": 0, "priority": false}'),
  ('Growth Plan', '20 enhanced images + 2 social posts per month', 'subscription', 150.00, 180.00, 20, 11, '{"category": "subscription", "tier": "growth", "social_posts": 2, "priority": false, "popular": true}'),
  ('Premium Plan', '40 images + 4 social posts + priority turnaround', 'subscription', 280.00, 350.00, 40, 12, '{"category": "subscription", "tier": "premium", "social_posts": 4, "priority": true}');


-- ============================================================
-- SECTION 12: DATABASE FUNCTIONS
-- ============================================================

-- Check subscription usage
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
  ORDER BY created_at DESC LIMIT 1;

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

-- Consume subscription image
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
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;

  IF v_subscription.id IS NULL THEN RETURN false; END IF;

  IF v_subscription.rollover_images > 0 THEN
    UPDATE subscriptions SET rollover_images = rollover_images - 1, updated_at = NOW()
    WHERE id = v_subscription.id;
  ELSIF v_subscription.images_used_this_month < v_subscription.images_per_month THEN
    UPDATE subscriptions SET images_used_this_month = images_used_this_month + 1, updated_at = NOW()
    WHERE id = v_subscription.id;
  ELSE
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monthly subscription reset (with rollover)
CREATE OR REPLACE FUNCTION reset_monthly_subscription_usage()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions SET
    rollover_images = LEAST(5, images_per_month - images_used_this_month + rollover_images),
    images_used_this_month = 0,
    social_posts_used_this_month = 0,
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month',
    updated_at = NOW()
  WHERE status = 'active' AND current_period_end <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiter
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
  DELETE FROM rate_limits WHERE window_start < v_window_start;

  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier AND endpoint = p_endpoint AND window_start >= v_window_start;

  IF v_count >= p_max_requests THEN RETURN false; END IF;

  INSERT INTO rate_limits (identifier, endpoint, window_start) VALUES (p_identifier, p_endpoint, NOW());
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic token update (prevents race conditions)
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


-- ============================================================
-- SECTION 13: RLS POLICIES FOR PAYMENT TABLES
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Only admins can modify products"
  ON products FOR ALL USING (is_admin());

CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own purchases"
  ON one_time_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage purchases"
  ON one_time_purchases FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage webhook events"
  ON webhook_events FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- SECTION 14: PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON subscriptions(user_id, status, current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_one_time_purchases_user_id ON one_time_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_one_time_purchases_user_remaining ON one_time_purchases(user_id, images_remaining) WHERE images_remaining > 0;
CREATE INDEX IF NOT EXISTS idx_products_pricing_type ON products(pricing_type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_active_type ON products(pricing_type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);


-- ============================================================
-- SECTION 15: PERMISSIONS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON one_time_purchases TO authenticated;
GRANT EXECUTE ON FUNCTION check_subscription_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_tokens TO service_role;


-- ============================================================
-- SECTION 16: MAKE YOURSELF AN ADMIN
-- Run this AFTER you sign up, replacing YOUR_USER_ID
-- ============================================================

-- Find your user ID: SELECT id, email FROM auth.users;
-- Then run:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'admin');
