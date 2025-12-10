import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

// Helper function to send email notifications
async function sendEmail(to: string, template: string, data: Record<string, any>) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ to, template, data }),
    });
    if (!response.ok) {
      console.error("Failed to send email:", await response.text());
    } else {
      console.log(`Email sent: ${template} to ${to}`);
    }
  } catch (error) {
    console.error("Email error:", error);
  }
}

// Subscription tier mapping
const SUBSCRIPTION_TIERS: Record<string, {
  tier: string;
  images_per_month: number;
  social_posts: number;
  priority: boolean;
}> = {
  starter: { tier: "starter", images_per_month: 10, social_posts: 0, priority: false },
  growth: { tier: "growth", images_per_month: 20, social_posts: 2, priority: false },
  premium: { tier: "premium", images_per_month: 40, social_posts: 4, priority: true },
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Record the event
    await supabase.from("webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object,
    });

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const purchaseType = session.metadata?.purchase_type; // 'one_time' or 'subscription'

  if (!userId) {
    console.error("No user_id in session metadata");
    return;
  }

  if (session.mode === "payment") {
    // One-time purchase (A La Carte)
    const imagesCount = parseInt(session.metadata?.images_count || "0");
    const productId = session.metadata?.product_id;

    if (imagesCount > 0) {
      await supabase.from("one_time_purchases").insert({
        user_id: userId,
        product_id: productId,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_checkout_session_id: session.id,
        images_purchased: imagesCount,
        images_remaining: imagesCount,
        amount_paid: (session.amount_total || 0) / 100,
        currency: session.currency || "sgd",
        status: "completed",
      });

      console.log(`Recorded one-time purchase: ${imagesCount} images for user ${userId}`);
    }

    // Also add tokens for backward compatibility
    const tokensToAdd = parseInt(session.metadata?.tokens || "0");
    if (tokensToAdd > 0) {
      const { data: existingTokens } = await supabase
        .from("user_tokens")
        .select("tokens")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingTokens) {
        await supabase
          .from("user_tokens")
          .update({ tokens: existingTokens.tokens + tokensToAdd })
          .eq("user_id", userId);
      } else {
        await supabase.from("user_tokens").insert({ user_id: userId, tokens: tokensToAdd });
      }

      console.log(`Added ${tokensToAdd} tokens to user ${userId}`);
    }

    // Send purchase confirmation email
    if (session.customer_email) {
      await sendEmail(session.customer_email, "purchase_confirmation", {
        packageName: session.metadata?.package_name || "Image Pack",
        imagesCount: imagesCount || tokensToAdd,
        amount: ((session.amount_total || 0) / 100).toFixed(2),
        dashboardUrl: "https://dishtransform.com/dashboard",
      });
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const userId = existingSub?.user_id || subscription.metadata?.user_id;

  if (!userId) {
    console.error("Cannot find user for subscription:", subscription.id);
    return;
  }

  const tierName = subscription.metadata?.tier || "starter";
  const tierConfig = SUBSCRIPTION_TIERS[tierName] || SUBSCRIPTION_TIERS.starter;

  // Get product ID from metadata or find matching product
  let productId = subscription.metadata?.product_id;
  if (!productId) {
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("pricing_type", "subscription")
      .ilike("name", `%${tierName}%`)
      .maybeSingle();
    productId = product?.id;
  }

  const subscriptionData = {
    user_id: userId,
    product_id: productId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    tier: tierConfig.tier,
    status: subscription.status,
    images_per_month: tierConfig.images_per_month,
    social_posts_per_month: tierConfig.social_posts,
    has_priority_turnaround: tierConfig.priority,
    has_free_reedits: tierConfig.priority,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Upsert subscription
  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, { onConflict: "stripe_subscription_id" });

  if (error) {
    console.error("Failed to upsert subscription:", error);
    return;
  }

  console.log(`Updated subscription for user ${userId}: ${tierConfig.tier} plan`);

  // Send subscription confirmation email
  const customer = await stripe.customers.retrieve(customerId);
  if (customer && !customer.deleted && customer.email) {
    await sendEmail(customer.email, "subscription_started", {
      planName: `${tierConfig.tier.charAt(0).toUpperCase() + tierConfig.tier.slice(1)} Plan`,
      imagesPerMonth: tierConfig.images_per_month,
      socialPosts: tierConfig.social_posts,
      priority: tierConfig.priority,
      dashboardUrl: "https://dishtransform.com/dashboard",
    });
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to cancel subscription:", error);
    return;
  }

  console.log(`Cancelled subscription: ${subscription.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    // Reset monthly usage for subscription renewals
    const { error } = await supabase
      .from("subscriptions")
      .update({
        images_used_this_month: 0,
        social_posts_used_this_month: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", invoice.subscription as string);

    if (error) {
      console.error("Failed to reset subscription usage:", error);
    } else {
      console.log(`Reset monthly usage for subscription: ${invoice.subscription}`);
    }
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", invoice.subscription as string);

    if (error) {
      console.error("Failed to update subscription status:", error);
    } else {
      console.log(`Marked subscription as past_due: ${invoice.subscription}`);
    }
  }
}
