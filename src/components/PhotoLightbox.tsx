import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ComparisonSlider from "./ComparisonSlider";
import { useEffect } from "react";

interface PhotoLightboxProps {
  open: boolean;
  onClose: () => void;
  originalImage: string;
  enhancedImage: string;
  settingName: string;
  onNavigate: (direction: "prev" | "next") => void;
  onDownload: (imageUrl: string, name: string) => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
}

const PhotoLightbox = ({
  open,
  onClose,
  originalImage,
  enhancedImage,
  settingName,
  onNavigate,
  onDownload,
  canNavigatePrev,
  canNavigateNext,
}: PhotoLightboxProps) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && canNavigatePrev) onNavigate("prev");
      if (e.key === "ArrowRight" && canNavigateNext) onNavigate("next");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onNavigate, canNavigatePrev, canNavigateNext]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-background/95 backdrop-blur-xl border-2 border-border">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
            <h3 className="text-xl font-semibold text-foreground">{settingName}</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onDownload(enhancedImage, settingName)}
                className="shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <div className="max-w-5xl w-full">
              <ComparisonSlider
                beforeImage={originalImage}
                afterImage={enhancedImage}
                label={settingName}
              />
            </div>
          </div>

          {/* Navigation arrows */}
          {canNavigatePrev && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full shadow-lg"
              onClick={() => onNavigate("prev")}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          {canNavigateNext && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full shadow-lg"
              onClick={() => onNavigate("next")}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoLightbox;
