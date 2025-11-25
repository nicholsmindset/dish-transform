import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Hero from "@/components/Hero";
import PhotoUploadSection from "@/components/PhotoUploadSection";
import LoadingState from "@/components/LoadingState";
import PhotoComparisonGrid from "@/components/PhotoComparisonGrid";
import PhotoLightbox from "@/components/PhotoLightbox";
import ResultsActions from "@/components/ResultsActions";
import StyleSelector from "@/components/StyleSelector";
import RegenerateOptions from "@/components/RegenerateOptions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TokenBalance } from "@/components/TokenBalance";
import { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import JSZip from "jszip";

type AppState = "hero" | "upload" | "generating" | "results";

interface EnhancedPhoto {
  name: string;
  imageUrl: string;
  style: string;
}

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>("hero");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [enhancedPhotos, setEnhancedPhotos] = useState<EnhancedPhoto[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState("");
  const [completedCount, setCompletedCount] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(0);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = useCallback(() => {
    setAppState("upload");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setOriginalImageUrl(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setOriginalImageUrl(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!originalImageUrl) {
      toast({
        title: "No image selected",
        description: "Please select an image first",
        variant: "destructive",
      });
      return;
    }

    // Check token balance for logged-in users
    if (user) {
      try {
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('check-tokens');
        if (tokenError) {
          console.error("Token check error:", tokenError);
        } else if (tokenData && tokenData.tokens < 1) {
          toast({
            title: "Insufficient tokens",
            description: "You need at least 1 token to enhance photos. Please purchase more tokens.",
            variant: "destructive",
          });
          navigate("/pricing");
          return;
        }
      } catch (error) {
        console.error("Token check failed:", error);
        // Continue anyway if token check fails - let the backend handle it
      }
    }

    setIsGenerating(true);
    setAppState("generating");
    setCurrentPhoto("Analyzing your photo...");
    setCompletedCount(0);

    try {
      let photoLibraryId = null;

      // If user is logged in, save original photo to library
      if (user) {
        const { data: photoData, error: photoError } = await supabase
          .from('photo_library')
          .insert({
            user_id: user.id,
            original_image_url: originalImageUrl,
            dish_name: selectedImage?.name.replace(/\.[^/.]+$/, "") || "Untitled Dish",
          })
          .select()
          .single();

        if (photoError) {
          console.error("Failed to save to library:", photoError);
        } else {
          photoLibraryId = photoData.id;
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-food-photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            imageUrl: originalImageUrl,
            userId: user?.id,
            photoLibraryId,
            selectedStyles: selectedStyles.length > 0 ? selectedStyles : undefined,
            customPrompt: customPrompt.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error codes
        if (response.status === 402) {
          // Insufficient tokens
          toast({
            title: "Insufficient tokens",
            description: `You need ${errorData.tokensRequired || 1} token(s) but have ${errorData.tokensAvailable || 0}. Please purchase more tokens.`,
            variant: "destructive",
          });
          setAppState("upload");
          setIsGenerating(false);
          navigate("/pricing");
          return;
        }

        if (response.status === 401) {
          toast({
            title: "Authentication required",
            description: "Please sign in to enhance photos.",
            variant: "destructive",
          });
          setAppState("upload");
          setIsGenerating(false);
          navigate("/auth");
          return;
        }

        throw new Error(errorData.error || "Failed to enhance photo");
      }

      const data = await response.json();

      if (!data.photos || data.photos.length === 0) {
        throw new Error("No enhanced photos were generated");
      }

      setEnhancedPhotos(data.photos);
      setAppState("results");
      setIsGenerating(false);

      // Show tokens remaining in success message
      const tokensMessage = data.metadata?.tokensRemaining !== undefined
        ? ` (${data.metadata.tokensRemaining} tokens remaining)`
        : '';

      toast({
        title: "Success!",
        description: user
          ? `Generated ${data.photos.length} professional versions and saved to your library${tokensMessage}`
          : `Generated ${data.photos.length} professional versions. Sign up to save them!`,
      });
    } catch (error) {
      console.error("Error enhancing photo:", error);
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Failed to enhance photo. Please try again.",
        variant: "destructive",
      });
      setAppState("upload");
      setIsGenerating(false);
    }
  }, [originalImageUrl, user, selectedImage, toast, navigate]);

  const handleDownloadSingle = useCallback(async (imageUrl: string, name: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Downloaded",
        description: `${name} downloaded successfully`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDownloadAll = useCallback(async () => {
    try {
      const zip = new JSZip();

      for (const photo of enhancedPhotos) {
        const response = await fetch(photo.imageUrl);
        const blob = await response.blob();
        zip.file(`${photo.style}.png`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "menu-visuals-enhanced.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Downloaded",
        description: "All 3 enhanced photos downloaded as ZIP",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to create ZIP file",
        variant: "destructive",
      });
    }
  }, [enhancedPhotos, toast]);

  const handleEnhanceAnother = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setOriginalImageUrl(null);
    setEnhancedPhotos([]);
    setSelectedStyles([]);
    setCustomPrompt("");
    setAppState("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleRegenerateStyles = useCallback(async (stylesToRegenerate: string[]) => {
    if (!originalImageUrl) return;

    // Check token balance for logged-in users
    if (user) {
      try {
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('check-tokens');
        if (tokenError) {
          console.error("Token check error:", tokenError);
        } else if (tokenData && tokenData.tokens < 1) {
          toast({
            title: "Insufficient tokens",
            description: "You need at least 1 token to regenerate styles. Please purchase more tokens.",
            variant: "destructive",
          });
          navigate("/pricing");
          return;
        }
      } catch (error) {
        console.error("Token check failed:", error);
      }
    }

    setIsGenerating(true);
    setAppState("generating");
    setCurrentPhoto("Regenerating selected styles...");
    setCompletedCount(0);

    try {
      let photoLibraryId = null;

      if (user) {
        const { data: photoData } = await supabase
          .from('photo_library')
          .select('id')
          .eq('original_image_url', originalImageUrl)
          .eq('user_id', user.id)
          .single();
        
        photoLibraryId = photoData?.id;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-food-photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            imageUrl: originalImageUrl,
            userId: user?.id,
            photoLibraryId,
            selectedStyles: stylesToRegenerate,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error codes
        if (response.status === 402) {
          toast({
            title: "Insufficient tokens",
            description: `You need ${errorData.tokensRequired || 1} token(s) but have ${errorData.tokensAvailable || 0}. Please purchase more tokens.`,
            variant: "destructive",
          });
          setAppState("results");
          setIsGenerating(false);
          navigate("/pricing");
          return;
        }

        throw new Error(errorData.error || "Failed to regenerate styles");
      }

      const data = await response.json();

      // Update existing photos with regenerated ones
      const updatedPhotos = [...enhancedPhotos];
      data.photos.forEach((newPhoto: EnhancedPhoto) => {
        const index = updatedPhotos.findIndex(p => p.name === newPhoto.name);
        if (index !== -1) {
          updatedPhotos[index] = newPhoto;
        }
      });

      setEnhancedPhotos(updatedPhotos);
      setAppState("results");
      setIsGenerating(false);

      // Show tokens remaining
      const tokensMessage = data.metadata?.tokensRemaining !== undefined
        ? ` (${data.metadata.tokensRemaining} tokens remaining)`
        : '';

      toast({
        title: "Regenerated!",
        description: `Successfully regenerated ${data.photos.length} style(s)${tokensMessage}`,
      });
    } catch (error) {
      console.error("Error regenerating:", error);
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Failed to regenerate. Please try again.",
        variant: "destructive",
      });
      setAppState("results");
      setIsGenerating(false);
    }
  }, [originalImageUrl, user, enhancedPhotos, toast, navigate]);

  const handleOpenLightbox = useCallback((index: number) => {
    setLightboxPhotoIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const handleNavigatePhoto = useCallback((direction: "prev" | "next") => {
    setLightboxPhotoIndex((prev) => {
      if (direction === "prev") {
        return Math.max(0, prev - 1);
      } else {
        return Math.min(enhancedPhotos.length - 1, prev + 1);
      }
    });
  }, [enhancedPhotos.length]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 
              onClick={() => setAppState("hero")}
              className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            >
              MenuVisuals
            </h1>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                    My Library
                  </Button>
                  <TokenBalance compact />
                  <Button variant="ghost" onClick={async () => {
                    await supabase.auth.signOut();
                    toast({ title: "Signed out successfully" });
                  }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate("/auth")}>
                    Sign In
                  </Button>
                  <Button onClick={() => navigate("/auth")}>
                    Get Started
                  </Button>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {appState === "hero" && <Hero onGetStarted={handleGetStarted} />}

      {appState === "upload" && (
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Upload Your Food Photo
            </h2>
            <p className="text-xl text-muted-foreground">
              We'll transform it into 3 professional versions
            </p>
          </div>

          <PhotoUploadSection
            onImageSelect={handleImageSelect}
            selectedImage={selectedImage}
            imagePreview={imagePreview}
            onClearImage={handleClearImage}
          />

          {selectedImage && (
            <div className="max-w-2xl mx-auto mt-8 space-y-6">
              <StyleSelector
                selectedStyles={selectedStyles}
                onStylesChange={setSelectedStyles}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
              />
              
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerate}
                  size="lg"
                  className="bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-food text-lg px-12 py-6 rounded-full"
                  disabled={isGenerating}
                >
                  {selectedStyles.length === 0 && !customPrompt.trim() 
                    ? "Generate 3 Pro Versions"
                    : `Generate ${selectedStyles.length + (customPrompt.trim() ? 1 : 0)} Version${selectedStyles.length + (customPrompt.trim() ? 1 : 0) > 1 ? 's' : ''}`
                  }
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {appState === "generating" && (
        <LoadingState currentPhoto={currentPhoto} completedCount={completedCount} />
      )}

      {appState === "results" && originalImageUrl && (
        <>
          <div className="container mx-auto px-4 py-8">
            <RegenerateOptions
              photos={enhancedPhotos}
              originalImageUrl={originalImageUrl}
              onRegenerate={handleRegenerateStyles}
              isGenerating={isGenerating}
            />
          </div>
          <PhotoComparisonGrid
            originalImage={originalImageUrl}
            enhancedPhotos={enhancedPhotos}
            onDownload={handleDownloadSingle}
            onOpenLightbox={handleOpenLightbox}
          />
          <ResultsActions
            photos={enhancedPhotos}
            onDownloadAll={handleDownloadAll}
            onEnhanceAnother={handleEnhanceAnother}
          />
        </>
      )}

      {lightboxOpen && enhancedPhotos[lightboxPhotoIndex] && originalImageUrl && (
        <PhotoLightbox
          open={lightboxOpen}
          onClose={handleCloseLightbox}
          originalImage={originalImageUrl}
          enhancedImage={enhancedPhotos[lightboxPhotoIndex].imageUrl}
          settingName={enhancedPhotos[lightboxPhotoIndex].name}
          onNavigate={handleNavigatePhoto}
          onDownload={handleDownloadSingle}
          canNavigatePrev={lightboxPhotoIndex > 0}
          canNavigateNext={lightboxPhotoIndex < enhancedPhotos.length - 1}
        />
      )}

      {/* Footer */}
      <footer className="bg-card/50 backdrop-blur-sm border-t border-border py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-foreground mb-6">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-card rounded-xl p-6 border border-border shadow-warm">
                <h4 className="font-semibold text-lg mb-2">Small Restaurant</h4>
                <p className="text-3xl font-bold text-primary mb-2">$79/mo</p>
                <p className="text-muted-foreground text-sm">30 dishes (90 photos)</p>
              </div>
              <div className="bg-gradient-hero rounded-xl p-6 border-2 border-primary shadow-food">
                <h4 className="font-semibold text-lg mb-2 text-primary-foreground">Multi-Location</h4>
                <p className="text-3xl font-bold text-primary-foreground mb-2">$199/mo</p>
                <p className="text-primary-foreground/80 text-sm">100 dishes (300 photos)</p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border shadow-warm">
                <h4 className="font-semibold text-lg mb-2">Enterprise Chain</h4>
                <p className="text-3xl font-bold text-accent mb-2">$499/mo</p>
                <p className="text-muted-foreground text-sm">Unlimited + API access</p>
              </div>
            </div>
            <p className="text-muted-foreground">
              Built with Lovable + fal.ai
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
