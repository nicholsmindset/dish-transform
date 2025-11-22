import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Token packages mapping
const TOKEN_PACKAGES = {
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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID required");
    }

    console.log(`Verifying payment for session: ${sessionId}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const userId = session.metadata?.user_id;
    const tokensToAdd = parseInt(session.metadata?.tokens || "0");
    
    if (!userId || !tokensToAdd) {
      throw new Error("Invalid session metadata");
    }

    console.log(`Payment verified for user ${userId}, adding ${tokensToAdd} tokens`);

    // Check if purchase already recorded
    const { data: existingPurchase } = await supabaseClient
      .from('token_purchases')
      .select('id')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();

    if (existingPurchase) {
      console.log(`Purchase already recorded: ${existingPurchase.id}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Tokens already added",
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get line item details
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const priceId = lineItems.data[0]?.price?.id;

    // Record purchase
    const { error: purchaseError } = await supabaseClient
      .from('token_purchases')
      .insert({
        user_id: userId,
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: session.payment_intent as string,
        product_id: lineItems.data[0]?.price?.product as string,
        price_id: priceId,
        tokens_purchased: tokensToAdd,
        amount_paid: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'completed',
      });

    if (purchaseError) {
      console.error("Failed to record purchase:", purchaseError);
      throw new Error("Failed to record purchase");
    }

    // Update or create token balance
    const { data: existingTokens } = await supabaseClient
      .from('user_tokens')
      .select('tokens')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingTokens) {
      const { error: updateError } = await supabaseClient
        .from('user_tokens')
        .update({ tokens: existingTokens.tokens + tokensToAdd })
        .eq('user_id', userId);
      
      if (updateError) throw new Error("Failed to update token balance");
    } else {
      const { error: insertError } = await supabaseClient
        .from('user_tokens')
        .insert({ user_id: userId, tokens: tokensToAdd });
      
      if (insertError) throw new Error("Failed to create token balance");
    }

    console.log(`Successfully added ${tokensToAdd} tokens to user ${userId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      tokensAdded: tokensToAdd,
      message: `${tokensToAdd} tokens added to your account!` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
