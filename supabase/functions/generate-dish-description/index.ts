import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dishName, tone, ingredients } = await req.json();
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
