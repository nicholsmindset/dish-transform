import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlatformDimensions {
  [key: string]: { width: number; height: number };
}

const PLATFORM_SIZES: PlatformDimensions = {
  'instagram_post': { width: 1080, height: 1080 },
  'instagram_story': { width: 1080, height: 1920 },
  'facebook_post': { width: 1200, height: 630 },
  'twitter_post': { width: 1200, height: 675 },
  'pinterest_pin': { width: 1000, height: 1500 },
  'tiktok': { width: 1080, height: 1920 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, platforms, enhancedPhotoId } = await req.json();

    if (!imageUrl || !platforms || !Array.isArray(platforms)) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl or platforms array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    
    const results = [];

    for (const platform of platforms) {
      if (!PLATFORM_SIZES[platform]) {
        console.warn(`Unknown platform: ${platform}`);
        continue;
      }

      const dimensions = PLATFORM_SIZES[platform];
      console.log(`Resizing for ${platform}: ${dimensions.width}x${dimensions.height}`);

      // For now, we'll store the original image with platform metadata
      // In a production app, you'd use a proper image processing library
      const fileName = `social/${Date.now()}-${platform}.png`;
      const imageArrayBuffer = await imageBlob.arrayBuffer();
      const imageBuffer = new Uint8Array(imageArrayBuffer);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('enhanced-photos')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error(`Failed to upload for ${platform}:`, uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('enhanced-photos')
        .getPublicUrl(fileName);

      const socialUrl = urlData.publicUrl;

      // Save to database if enhancedPhotoId provided
      if (enhancedPhotoId) {
        const { error: dbError } = await supabase
          .from('social_exports')
          .insert({
            enhanced_photo_id: enhancedPhotoId,
            platform: platform,
            dimensions: `${dimensions.width}x${dimensions.height}`,
            image_url: socialUrl
          });

        if (dbError) {
          console.error(`Failed to save ${platform} export to database:`, dbError);
        }
      }

      results.push({
        platform,
        dimensions: `${dimensions.width}x${dimensions.height}`,
        imageUrl: socialUrl
      });

      console.log(`${platform} complete`);
    }

    if (results.length === 0) {
      throw new Error("No social media versions were generated successfully");
    }

    return new Response(
      JSON.stringify({ 
        exports: results,
        metadata: {
          totalGenerated: results.length,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to resize for social media";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
