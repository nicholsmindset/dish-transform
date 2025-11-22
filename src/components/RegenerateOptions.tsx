import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface EnhancedPhoto {
  name: string;
  imageUrl: string;
  style: string;
}

interface RegenerateOptionsProps {
  photos: EnhancedPhoto[];
  originalImageUrl: string;
  onRegenerate: (styles: string[]) => void;
  isGenerating: boolean;
}

const RegenerateOptions = ({
  photos,
  onRegenerate,
  isGenerating,
}: RegenerateOptionsProps) => {
  const [selectedForRegenerate, setSelectedForRegenerate] = useState<string[]>([]);

  const handleToggle = (styleName: string) => {
    if (selectedForRegenerate.includes(styleName)) {
      setSelectedForRegenerate(selectedForRegenerate.filter((s) => s !== styleName));
    } else {
      setSelectedForRegenerate([...selectedForRegenerate, styleName]);
    }
  };

  const handleRegenerate = () => {
    if (selectedForRegenerate.length > 0) {
      onRegenerate(selectedForRegenerate);
      setSelectedForRegenerate([]);
    }
  };

  return (
    <Card className="mx-auto max-w-3xl p-6 bg-card/50 backdrop-blur-sm border-primary/20 mb-8">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Regenerate Specific Styles
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Select which versions you'd like to regenerate with the same photo
      </p>
      
      <div className="space-y-3 mb-6">
        {photos.map((photo) => (
          <div
            key={photo.name}
            className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => handleToggle(photo.name)}
          >
            <Checkbox
              id={`regen-${photo.name}`}
              checked={selectedForRegenerate.includes(photo.name)}
              onCheckedChange={() => handleToggle(photo.name)}
            />
            <Label
              htmlFor={`regen-${photo.name}`}
              className="flex-1 cursor-pointer font-medium"
            >
              {photo.name}
            </Label>
            <img
              src={photo.imageUrl}
              alt={photo.name}
              className="w-12 h-12 rounded object-cover"
            />
          </div>
        ))}
      </div>

      <Button
        onClick={handleRegenerate}
        disabled={selectedForRegenerate.length === 0 || isGenerating}
        className="w-full"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Regenerate {selectedForRegenerate.length} Selected
      </Button>
    </Card>
  );
};

export default RegenerateOptions;
