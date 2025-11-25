import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle2, AlertCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BatchUploadProps {
  userId: string;
  onComplete?: () => void;
}

interface BatchPhoto {
  file: File;
  preview: string;
  status: "pending" | "processing" | "complete" | "failed";
  enhancedUrls?: string[];
  error?: string;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function BatchUpload({ userId, onComplete }: BatchUploadProps) {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<BatchPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);

  useEffect(() => {
    checkTokenBalance();
  }, []);

  const checkTokenBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-tokens');
      if (error) throw error;
      setTokenBalance(data.tokens || 0);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setTokenBalance(0);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      return true;
    });

    const newPhotos: BatchPhoto[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
    }));

    setPhotos(newPhotos);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*";
    
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
    
    handleFileSelect({ target: input } as any);
  }, [handleFileSelect]);

  const processPhoto = async (photo: BatchPhoto, index: number) => {
    setCurrentIndex(index);
    setPhotos(prev => prev.map((p, i) => 
      i === index ? { ...p, status: "processing" } : p
    ));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(photo.file);
      });
      const imageUrl = await base64Promise;

      // Save to photo library
      const { data: photoData, error: photoError } = await supabase
        .from('photo_library')
        .insert({
          user_id: userId,
          original_image_url: imageUrl,
          dish_name: photo.file.name.replace(/\.[^/.]+$/, ""),
        })
        .select()
        .single();

      if (photoError) throw photoError;

      // Enhance photo
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-food-photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            imageUrl,
            userId,
            photoLibraryId: photoData.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to enhance photo");
      }

      const data = await response.json();
      const enhancedUrls = data.photos.map((p: any) => p.imageUrl);

      setPhotos(prev => prev.map((p, i) => 
        i === index ? { ...p, status: "complete", enhancedUrls } : p
      ));
    } catch (error: any) {
      console.error(`Failed to process photo ${index}:`, error);
      setPhotos(prev => prev.map((p, i) => 
        i === index ? { ...p, status: "failed", error: error.message } : p
      ));
    }
  };

  const handleStartBatch = async () => {
    if (photos.length === 0) return;

    // Check token balance before starting
    const requiredTokens = photos.length;
    if (tokenBalance !== null && tokenBalance < requiredTokens) {
      toast.error(`Insufficient tokens. You need ${requiredTokens} tokens but only have ${tokenBalance}.`);
      navigate('/pricing');
      return;
    }

    setIsProcessing(true);

    // Create batch record
    const { data: batchData } = await supabase
      .from('batch_uploads')
      .insert({
        user_id: userId,
        total_images: photos.length,
      })
      .select()
      .single();

    // Process each photo sequentially
    for (let i = 0; i < photos.length; i++) {
      await processPhoto(photos[i], i);
    }

    // Update batch status
    if (batchData) {
      await supabase
        .from('batch_uploads')
        .update({
          completed_images: photos.filter(p => p.status === "complete").length,
          status: photos.every(p => p.status === "complete") ? "complete" : "partial",
        })
        .eq('id', batchData.id);
    }

    setIsProcessing(false);
    toast.success("Batch processing complete!");
    onComplete?.();
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const completedCount = photos.filter(p => p.status === "complete").length;
  const failedCount = photos.filter(p => p.status === "failed").length;

  return (
    <div className="space-y-6">
      {photos.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            >
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Upload Multiple Photos</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop up to {MAX_FILES} food photos here
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isProcessing}
                />
                <Button asChild>
                  <span>Select Files</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">
                {isProcessing ? `Processing ${currentIndex + 1} of ${photos.length}` : `${photos.length} photos selected`}
              </h3>
              {isProcessing ? (
                <p className="text-sm text-muted-foreground">
                  {completedCount} completed, {failedCount} failed
                </p>
              ) : (
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    Cost: {photos.length} token{photos.length !== 1 ? 's' : ''}
                  </p>
                  {!loadingTokens && tokenBalance !== null && (
                    <p className={`text-sm ${tokenBalance >= photos.length ? 'text-green-600' : 'text-red-600'}`}>
                      Balance: {tokenBalance} tokens
                    </p>
                  )}
                </div>
              )}
            </div>
            {!isProcessing && (
              <div className="flex items-center gap-2">
                {!loadingTokens && tokenBalance !== null && tokenBalance < photos.length && (
                  <Button variant="outline" onClick={() => navigate('/pricing')}>
                    Buy Tokens
                  </Button>
                )}
                <Button
                  onClick={handleStartBatch}
                  disabled={loadingTokens || (tokenBalance !== null && tokenBalance < photos.length)}
                >
                  Start Batch Enhancement
                </Button>
              </div>
            )}
          </div>

          {isProcessing && (
            <Progress value={(completedCount / photos.length) * 100} />
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <Card key={index} className="relative">
                <CardContent className="p-2">
                  <div className="aspect-square rounded overflow-hidden mb-2 relative">
                    <img
                      src={photo.preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {photo.status === "processing" && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    )}
                    {photo.status === "complete" && (
                      <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {photo.status === "failed" && (
                      <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {!isProcessing && photo.status === "pending" && (
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-center truncate">
                    {photo.file.name}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
