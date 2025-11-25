import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlatformDimensions {
  width: number;
  height: number;
  name: string;
}

const PLATFORM_SIZES: Record<string, PlatformDimensions> = {
  'instagram_post': { width: 1080, height: 1080, name: 'Instagram Post' },
  'instagram_story': { width: 1080, height: 1920, name: 'Instagram Story' },
  'facebook_post': { width: 1200, height: 630, name: 'Facebook Post' },
  'twitter_post': { width: 1200, height: 675, name: 'Twitter/X Post' },
  'pinterest_pin': { width: 1000, height: 1500, name: 'Pinterest Pin' },
  'tiktok': { width: 1080, height: 1920, name: 'TikTok' },
};

// Resize image to fit within dimensions while maintaining aspect ratio, then crop to exact size
async function resizeAndCrop(
  imageData: Uint8Array,
  targetWidth: number,
  targetHeight: number
): Promise<Uint8Array> {
  const image = await Image.decode(imageData);

  const srcWidth = image.width;
  const srcHeight = image.height;
  const targetRatio = targetWidth / targetHeight;
  const srcRatio = srcWidth / srcHeight;

  let cropWidth: number;
  let cropHeight: number;
  let cropX: number;
  let cropY: number;

  // Determine crop dimensions to match target aspect ratio
  if (srcRatio > targetRatio) {
    // Source is wider - crop horizontally
    cropHeight = srcHeight;
    cropWidth = Math.round(srcHeight * targetRatio);
    cropX = Math.round((srcWidth - cropWidth) / 2);
    cropY = 0;
  } else {
    // Source is taller - crop vertically
    cropWidth = srcWidth;
    cropHeight = Math.round(srcWidth / targetRatio);
    cropX = 0;
    cropY = Math.round((srcHeight - cropHeight) / 2);
  }

  // Crop to aspect ratio
  const cropped = image.crop(cropX, cropY, cropWidth, cropHeight);

  // Resize to target dimensions
  const resized = cropped.resize(targetWidth, targetHeight);

  // Encode as PNG
  return await resized.encode();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, platforms, enhancedPhotoId, userId } = await req.json();

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
    console.log("Fetching original image...");
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const originalImageData = new Uint8Array(imageArrayBuffer);

    console.log(`Original image size: ${originalImageData.length} bytes`);

    const results = [];

    for (const platform of platforms) {
      if (!PLATFORM_SIZES[platform]) {
        console.warn(`Unknown platform: ${platform}`);
        continue;
      }

      const dimensions = PLATFORM_SIZES[platform];
      console.log(`Resizing for ${platform}: ${dimensions.width}x${dimensions.height}`);

      try {
        // Actually resize the image
        const resizedImageData = await resizeAndCrop(
          originalImageData,
          dimensions.width,
          dimensions.height
        );

        console.log(`Resized image size for ${platform}: ${resizedImageData.length} bytes`);

        // Upload to storage
        const fileName = `social/${userId || 'anonymous'}/${Date.now()}-${platform}.png`;

        const { error: uploadError } = await supabase.storage
          .from('enhanced-photos')
          .upload(fileName, resizedImageData, {
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
          platformName: dimensions.name,
          dimensions: `${dimensions.width}x${dimensions.height}`,
          width: dimensions.width,
          height: dimensions.height,
          imageUrl: socialUrl
        });

        console.log(`${platform} complete`);
      } catch (resizeError) {
        console.error(`Failed to resize for ${platform}:`, resizeError);
        // Continue with other platforms
      }
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
