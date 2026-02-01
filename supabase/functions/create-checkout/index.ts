import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// A La Carte packages (SGD pricing) - Stripe Price IDs to be created
const A_LA_CARTE_PACKAGES: Record<string, {
  name: string;
  images: number;
  price_sgd: number;
  tokens?: number; // For backward compatibility
}> = {
  "price_single_image": { name: "Single Image Enhancement", images: 1, price_sgd: 17.50, tokens: 1 },
  "price_5_pack": { name: "5-Image Pack", images: 5, price_sgd: 67.50, tokens: 5 },
  "price_10_pack": { name: "10-Image Pack", images: 10, price_sgd: 110.00, tokens: 10 },
  "price_menu_makeover": { name: "Full Menu Makeover", images: 30, price_sgd: 275.00, tokens: 30 },
  "price_delivery_refresh": { name: "GrabFood/Deliveroo Listing", images: 20, price_sgd: 190.00, tokens: 20 },
};

// Subscription packages (SGD monthly pricing)
const SUBSCRIPTION_PACKAGES: Record<string, {
  name: string;
  tier: string;
  images_per_month: number;
  social_posts: number;
  priority: boolean;
  price_sgd: number;
}> = {
  "price_sub_starter": { name: "Starter Plan", tier: "starter", images_per_month: 10, social_posts: 0, priority: false, price_sgd: 90.00 },
  "price_sub_growth": { name: "Growth Plan", tier: "growth", images_per_month: 20, social_posts: 2, priority: false, price_sgd: 165.00 },
  "price_sub_premium": { name: "Premium Plan", tier: "premium", images_per_month: 40, social_posts: 4, priority: true, price_sgd: 315.00 },
};

// Legacy token packages for backward compatibility
const LEGACY_TOKEN_PACKAGES: Record<string, { tokens: number; name: string }> = {
  "price_1SWHKUDjNCv7xF61k4cyV8bH": { tokens: 30, name: "Starter Pack" },
  "price_1SWHKxDjNCv7xF61zfM3OKwY": { tokens: 100, name: "Pro Pack" },
  "price_1SWHLiDjNCv7xF61AYheH0Ts": { tokens: 300, name: "Business Pack" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { priceId, purchaseType = "one_time", productId } = await req.json();

    if (!priceId) {
      throw new Error("Price ID required");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (authError || !user?.email) {
      throw new Error("User not authenticated");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`Found existing customer: ${customerId}`);
    }

    // Use ALLOWED_ORIGIN for redirect URLs to prevent open redirect attacks
    const siteUrl = ALLOWED_ORIGIN !== "*"
      ? ALLOWED_ORIGIN
      : (Deno.env.get("SITE_URL") || "https://dishtransform.com");

    let session;

    // Handle subscription purchases
    if (purchaseType === "subscription" && SUBSCRIPTION_PACKAGES[priceId]) {
      const packageInfo = SUBSCRIPTION_PACKAGES[priceId];
      console.log(`Creating subscription checkout for user: ${user.email}, plan: ${packageInfo.name}`);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=subscription`,
        cancel_url: `${siteUrl}/pricing`,
        metadata: {
          user_id: user.id,
          purchase_type: "subscription",
          tier: packageInfo.tier,
          images_per_month: packageInfo.images_per_month.toString(),
          social_posts: packageInfo.social_posts.toString(),
          priority: packageInfo.priority.toString(),
          product_id: productId || "",
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            tier: packageInfo.tier,
            product_id: productId || "",
          },
        },
      });
    }
    // Handle A La Carte purchases
    else if (A_LA_CARTE_PACKAGES[priceId]) {
      const packageInfo = A_LA_CARTE_PACKAGES[priceId];
      console.log(`Creating one-time checkout for user: ${user.email}, package: ${packageInfo.name}`);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=one_time`,
        cancel_url: `${siteUrl}/pricing`,
        metadata: {
          user_id: user.id,
          purchase_type: "one_time",
          images_count: packageInfo.images.toString(),
          tokens: (packageInfo.tokens || packageInfo.images).toString(),
          product_id: productId || "",
        },
      });
    }
    // Handle legacy token packages for backward compatibility
    else if (LEGACY_TOKEN_PACKAGES[priceId]) {
      const packageInfo = LEGACY_TOKEN_PACKAGES[priceId];
      console.log(`Creating legacy checkout for user: ${user.email}, package: ${packageInfo.name}`);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing`,
        metadata: {
          user_id: user.id,
          tokens: packageInfo.tokens.toString(),
        },
      });
    }
    else {
      throw new Error("Invalid price ID");
    }

    console.log(`Checkout session created: ${session.id}`);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
