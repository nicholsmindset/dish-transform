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
        throw new Error(errorData.error || "Failed to enhance photo");
      }

      const data = await response.json();

      if (!data.photos || data.photos.length === 0) {
        throw new Error("No enhanced photos were generated");
      }

      setEnhancedPhotos(data.photos);
      setAppState("results");
      setIsGenerating(false);

      toast({
        title: "Success!",
        description: user 
          ? `Generated ${data.photos.length} professional versions and saved to your library`
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
  }, [originalImageUrl, user, selectedImage, toast]);

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

      toast({
        title: "Regenerated!",
        description: `Successfully regenerated ${data.photos.length} style(s)`,
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
  }, [originalImageUrl, user, enhancedPhotos, toast]);

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
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className={`${appState === "hero" ? "absolute" : "sticky"} top-0 left-0 right-0 z-50 ${appState !== "hero" ? "bg-neutral-950 border-b border-white/10" : "bg-transparent"}`}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1
              onClick={() => setAppState("hero")}
              className="text-xl font-light text-white tracking-[0.2em] uppercase cursor-pointer hover:text-amber-400 transition-colors"
            >
              Dish Transform
            </h1>
            <nav className="hidden md:flex items-center gap-10">
              <button
                onClick={() => navigate("/pricing")}
                className="text-white/70 hover:text-white text-sm tracking-wide transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-white/70 hover:text-white text-sm tracking-wide transition-colors"
              >
                Gallery
              </button>
            </nav>
            <div className="flex items-center gap-6">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/dashboard")}
                    className="text-white/70 hover:text-white hover:bg-transparent text-sm tracking-wide"
                  >
                    My Library
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      toast({ title: "Signed out successfully" });
                    }}
                    className="text-white/70 hover:text-white hover:bg-transparent text-sm tracking-wide"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/auth")}
                    className="text-white/70 hover:text-white hover:bg-transparent text-sm tracking-wide"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate("/auth")}
                    className="bg-transparent border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black rounded-none px-6 text-sm tracking-wide transition-all"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {appState === "hero" && <Hero onGetStarted={handleGetStarted} />}

      {appState === "upload" && (
        <div className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <p className="text-amber-500 uppercase tracking-[0.3em] text-sm font-light mb-6">
              Begin Your Transformation
            </p>
            <h2 className="text-4xl md:text-6xl font-light text-white mb-6 tracking-tight">
              Upload Your <span className="font-serif italic text-amber-100">Masterpiece</span>
            </h2>
            <p className="text-xl text-white/60 font-light max-w-xl mx-auto">
              We'll craft three distinct visual interpretations of your culinary creation
            </p>
          </div>

          <PhotoUploadSection
            onImageSelect={handleImageSelect}
            selectedImage={selectedImage}
            imagePreview={imagePreview}
            onClearImage={handleClearImage}
          />

          {selectedImage && (
            <div className="max-w-2xl mx-auto mt-12 space-y-8">
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
                  className="bg-amber-500 hover:bg-amber-400 text-black font-medium text-base px-12 py-7 rounded-none tracking-wide transition-all duration-300"
                  disabled={isGenerating}
                >
                  {selectedStyles.length === 0 && !customPrompt.trim()
                    ? "Create 3 Variations"
                    : `Create ${selectedStyles.length + (customPrompt.trim() ? 1 : 0)} Variation${selectedStyles.length + (customPrompt.trim() ? 1 : 0) > 1 ? "s" : ""}`}
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
      <footer className="bg-black border-t border-white/10 py-20 mt-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Top Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              {/* Brand */}
              <div className="md:col-span-2">
                <h3 className="text-xl font-light text-white tracking-[0.2em] uppercase mb-6">
                  Dish Transform
                </h3>
                <p className="text-white/50 font-light leading-relaxed max-w-md">
                  Elevating culinary photography for the world's most distinguished restaurants
                  and passionate food artisans.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-white/40 uppercase tracking-widest text-sm mb-6">Navigate</h4>
                <ul className="space-y-3">
                  <li>
                    <button onClick={() => navigate("/pricing")} className="text-white/60 hover:text-amber-400 text-sm transition-colors">
                      Pricing
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate("/dashboard")} className="text-white/60 hover:text-amber-400 text-sm transition-colors">
                      Gallery
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate("/auth")} className="text-white/60 hover:text-amber-400 text-sm transition-colors">
                      Sign In
                    </button>
                  </li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-white/40 uppercase tracking-widest text-sm mb-6">Connect</h4>
                <ul className="space-y-3">
                  <li className="text-white/60 text-sm">hello@dishtransform.com</li>
                  <li className="text-white/60 text-sm">Singapore</li>
                </ul>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-white/10 pt-10 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/30 text-sm">
                &copy; {new Date().getFullYear()} Dish Transform. All rights reserved.
              </p>
              <div className="flex items-center gap-8">
                <span className="text-white/30 text-sm">Privacy</span>
                <span className="text-white/30 text-sm">Terms</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
