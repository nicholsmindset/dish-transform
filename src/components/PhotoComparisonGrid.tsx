import { Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EnhancedPhoto {
  name: string;
  imageUrl: string;
  style: string;
}

interface PhotoComparisonGridProps {
  originalImage: string;
  enhancedPhotos: EnhancedPhoto[];
  onDownload: (imageUrl: string, name: string) => void;
  onOpenLightbox: (index: number) => void;
}

const PhotoComparisonGrid = ({
  originalImage,
  enhancedPhotos,
  onDownload,
  onOpenLightbox,
}: PhotoComparisonGridProps) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Original photo */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-foreground mb-4 text-center">
          Your Original Photo
        </h3>
        <div className="max-w-2xl mx-auto">
          <img
            src={originalImage}
            alt="Original"
            className="w-full rounded-2xl shadow-food border border-border"
          />
        </div>
      </div>

      {/* Enhanced versions */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
          Your Professional Versions
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {enhancedPhotos.map((photo, index) => (
          <Card
            key={index}
            className="group overflow-hidden border-2 border-border hover:border-primary/50 transition-all shadow-warm hover:shadow-food cursor-pointer"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={photo.imageUrl}
                alt={photo.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onClick={() => onOpenLightbox(index)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(photo.imageUrl, photo.name);
                  }}
                  className="shadow-lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLightbox(index);
                  }}
                  className="shadow-lg"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  View
                </Button>
              </div>
            </div>
            <div className="p-4 bg-card">
              <h4 className="font-semibold text-foreground text-center">{photo.name}</h4>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PhotoComparisonGrid;
