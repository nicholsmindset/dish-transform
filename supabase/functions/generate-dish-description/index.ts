import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 20 descriptions per hour per user
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dishName, tone, ingredients, userId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Check rate limit if userId is provided
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Get recent usage count
      const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

      const { count, error: countError } = await supabase
        .from('token_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', 'ai_description')
        .gte('created_at', oneHourAgo);

      if (countError) {
        console.error('Error checking rate limit:', countError);
        // Continue anyway if rate limit check fails
      } else if (count !== null && count >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({
            error: `Rate limit exceeded. You can generate up to ${RATE_LIMIT_MAX} descriptions per hour.`,
            retryAfter: 3600
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Log usage (doesn't cost tokens, just for tracking)
      const { error: usageError } = await supabase
        .from('token_usage')
        .insert({
          user_id: userId,
          tokens_used: 0, // Free feature, just tracking usage
          action_type: 'ai_description'
        });

      if (usageError) {
        console.error('Error logging usage:', usageError);
      }
    }

    const systemPrompt = `You are an expert menu copywriter. Generate appetizing, compelling dish descriptions that make customers want to order the dish.`;

    const toneInstructions = {
      casual: "Write in a friendly, conversational tone. Use simple language and make it approachable.",
      upscale: "Write in an elegant, sophisticated tone. Use refined language and emphasize quality.",
      romantic: "Write in a warm, intimate tone. Focus on sensory details and experience.",
      family: "Write in a welcoming, inclusive tone. Emphasize comfort and satisfaction."
    };

    const userPrompt = `Generate a compelling menu description for "${dishName}".
${ingredients ? `Ingredients: ${ingredients}` : ''}
Tone: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.casual}

Requirements:
- Keep it under 40 words
- Make it appetizing and descriptive
- Include sensory details (taste, texture, aroma)
- Don't use clichés
- Return ONLY the description text, no additional formatting or quotes`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI service rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service payment required." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI request failed');
    }

    const data = await response.json();
    const description = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
