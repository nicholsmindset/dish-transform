import { useCallback } from "react";
import { Camera, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadSectionProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  imagePreview: string | null;
  onClearImage: () => void;
}

const PhotoUploadSection = ({
  onImageSelect,
  selectedImage,
  imagePreview,
  onClearImage,
}: PhotoUploadSectionProps) => {
  const { toast } = useToast();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please select an image under 10MB",
            variant: "destructive",
          });
          return;
        }
        onImageSelect(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
      }
    },
    [onImageSelect, toast]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please select an image under 10MB",
            variant: "destructive",
          });
          return;
        }
        onImageSelect(file);
      }
    },
    [onImageSelect, toast]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative border-3 border-dashed border-primary/40 rounded-3xl p-12 text-center bg-gradient-warm hover:border-primary/60 transition-all cursor-pointer group shadow-warm"
      >
        {!imagePreview ? (
          <>
            <input
              type="file"
              accept="image/*,.heic"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Upload Your Food Photo</h3>
              <p className="text-muted-foreground mb-6">iPhone photos work great!</p>
              <Button variant="outline" className="pointer-events-none border-primary/50">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <p className="text-sm text-muted-foreground mt-4">or drag and drop here</p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 rounded-xl shadow-food mx-auto"
              />
              <Button
                onClick={onClearImage}
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 rounded-full shadow-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">{selectedImage?.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedImage && formatFileSize(selectedImage.size)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Helper tips */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          "✓ Natural lighting works best",
          "✓ Center the dish in frame",
          "✓ Don't worry about background - we'll fix it",
          "✓ Close-ups and full plates both work",
        ].map((tip) => (
          <div key={tip} className="flex items-center gap-2 text-muted-foreground bg-card/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-border">
            <span className="text-accent font-semibold">{tip.charAt(0)}</span>
            <span className="text-sm">{tip.slice(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoUploadSection;
