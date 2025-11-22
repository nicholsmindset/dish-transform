import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fal } from "https://esm.sh/@fal-ai/client@1.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, userId, photoLibraryId } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FAL_KEY = Deno.env.get("FAL_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FAL_KEY) {
      throw new Error("FAL_KEY not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    fal.config({
      credentials: FAL_KEY,
    });

    console.log("Enhancing food photo with 3 professional variations");

    // 3 variations with different settings and presentations
    const variations = [
      {
        name: "Clean White Background",
        prompt: `Transform this food photo into professional restaurant photography. Place the dish on a clean white surface with studio lighting. The food should look exactly the same but with professional presentation: sharp focus, perfect lighting, appetizing colors, high-end restaurant quality. Maintain the exact dish composition and ingredients. Remove any amateur elements (phones, hands, messy backgrounds). Professional menu photography style. 4K quality, shallow depth of field.`,
      },
      {
        name: "Rustic Table Setting",
        prompt: `Transform this food photo into professional restaurant photography. Place the dish on a rustic wooden table with natural ambient lighting. Add subtle context elements (napkin, cutlery) that enhance but don't distract. The food should look exactly the same but elevated: natural colors, warm lighting, cozy restaurant atmosphere. Maintain the exact dish composition and ingredients. Professional lifestyle food photography. 4K quality, inviting presentation.`,
      },
      {
        name: "Dark Moody Background",
        prompt: `Transform this food photo into professional restaurant photography. Place the dish against a dark, moody background with dramatic side lighting. The food should look exactly the same but more sophisticated: rich colors, artistic shadows, fine dining aesthetic. Maintain the exact dish composition and ingredients. Professional editorial food photography with cinematic quality. 4K quality, elegant and upscale.`,
      },
    ];

    const results = [];

    for (const variation of variations) {
      console.log(`Generating ${variation.name}...`);

      const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
        input: {
          prompt: variation.prompt,
          num_images: 1,
          aspect_ratio: "4:3",
          output_format: "png",
          image_urls: [imageUrl],
          resolution: "2K",
          guidance_scale: 7.5,
          num_inference_steps: 30,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log(`${variation.name} status:`, update.status);
            if (update.logs) {
              update.logs.map((log) => log.message).forEach(console.log);
            }
          }
        },
      });

      const imageResult = result.data?.images?.[0];
      if (!imageResult?.url) {
        console.error(`No image generated for ${variation.name}`);
        continue;
      }

      // Download the image from fal.ai
      console.log(`Downloading ${variation.name} from fal.ai...`);
      const imageResponse = await fetch(imageResult.url);
      const imageBlob = await imageResponse.blob();
      const imageArrayBuffer = await imageBlob.arrayBuffer();
      const imageBuffer = new Uint8Array(imageArrayBuffer);

      // Upload to Supabase Storage
      const fileName = `${userId || 'anonymous'}/${Date.now()}-${variation.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      console.log(`Uploading ${variation.name} to Supabase Storage: ${fileName}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('enhanced-photos')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error(`Failed to upload ${variation.name}:`, uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('enhanced-photos')
        .getPublicUrl(fileName);

      const permanentUrl = urlData.publicUrl;
      console.log(`${variation.name} stored at: ${permanentUrl}`);

      // If photoLibraryId is provided, save to database
      if (photoLibraryId) {
        const { error: dbError } = await supabase
          .from('enhanced_photos')
          .insert({
            photo_library_id: photoLibraryId,
            style_name: variation.name,
            image_url: permanentUrl
          });

        if (dbError) {
          console.error(`Failed to save ${variation.name} to database:`, dbError);
        }
      }

      results.push({
        name: variation.name,
        imageUrl: permanentUrl,
        style: variation.name.toLowerCase().replace(/\s+/g, '-'),
      });

      console.log(`${variation.name} complete`);
    }

    if (results.length === 0) {
      throw new Error("No enhanced photos were generated successfully");
    }

    return new Response(
      JSON.stringify({ 
        photos: results,
        metadata: {
          totalGenerated: results.length,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to enhance food photo";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
