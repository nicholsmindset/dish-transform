import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeInput(input: string, maxLength: number = 100): string {
  if (!input) return '';
  return input
    .replace(/[\n\r]/g, ' ')
    .replace(/[<>{}[\]\\]/g, '')
    .trim()
    .substring(0, maxLength);
}

const VALID_TONES = ['casual', 'upscale', 'romantic', 'family'] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dishName, tone, ingredients } = await req.json();

    // Validate and sanitize inputs
    const safeDishName = sanitizeInput(dishName, 100);
    const safeIngredients = sanitizeInput(ingredients, 300);
    const safeTone = VALID_TONES.includes(tone) ? tone : 'casual';

    if (!safeDishName) {
      return new Response(
        JSON.stringify({ error: "Dish name is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert menu copywriter. Generate appetizing, compelling dish descriptions that make customers want to order the dish.`;
    
    const toneInstructions = {
      casual: "Write in a friendly, conversational tone. Use simple language and make it approachable.",
      upscale: "Write in an elegant, sophisticated tone. Use refined language and emphasize quality.",
      romantic: "Write in a warm, intimate tone. Focus on sensory details and experience.",
      family: "Write in a welcoming, inclusive tone. Emphasize comfort and satisfaction."
    };

    const userPrompt = `Generate a compelling menu description for "${safeDishName}".
${safeIngredients ? `Ingredients: ${safeIngredients}` : ''}
Tone: ${toneInstructions[safeTone as keyof typeof toneInstructions]}

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
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
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
