import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Scissors } from "lucide-react";
import { toast } from "sonner";
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
  const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
    device: 'webgpu',
  });
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  resizeImageIfNeeded(canvas, ctx, imageElement);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.8);
  const result = await segmenter(imageData);
  
  if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
    throw new Error('Invalid segmentation result');
  }
  
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;
  const outputCtx = outputCanvas.getContext('2d');
  
  if (!outputCtx) throw new Error('Could not get output canvas context');
  
  outputCtx.drawImage(canvas, 0, 0);
  
  const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const data = outputImageData.data;
  
  for (let i = 0; i < result[0].mask.data.length; i++) {
    const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
    data[i * 4 + 3] = alpha;
  }
  
  outputCtx.putImageData(outputImageData, 0, 0);
  
  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/png',
      1.0
    );
  });
};

interface BackgroundRemoverProps {
  imageUrl: string;
  onRemoved: (blob: Blob) => void;
}

export function BackgroundRemover({ imageUrl, onRemoved }: BackgroundRemoverProps) {
  const [processing, setProcessing] = useState(false);

  const handleRemoveBackground = async () => {
    setProcessing(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const img = await loadImage(blob);
      const resultBlob = await removeBackground(img);
      
      onRemoved(resultBlob);
      toast.success("Background removed successfully!");
    } catch (error) {
      console.error('Error removing background:', error);
      toast.error("Failed to remove background");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Background Removal</h3>
        <img src={imageUrl} alt="Preview" className="w-full rounded-lg mb-4" />
        <Button 
          onClick={handleRemoveBackground} 
          disabled={processing}
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Removing Background...
            </>
          ) : (
            <>
              <Scissors className="w-4 h-4 mr-2" />
              Remove Background
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
