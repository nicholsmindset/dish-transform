import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedPhoto {
  name: string;
  imageUrl: string;
  style: string;
}

interface ResultsActionsProps {
  photos: EnhancedPhoto[];
  onDownloadAll: () => void;
  onEnhanceAnother: () => void;
}

const ResultsActions = ({
  onDownloadAll,
  onEnhanceAnother,
}: ResultsActionsProps) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-gradient-warm border-t border-border py-6 px-4 shadow-elegant backdrop-blur-sm z-10">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={onDownloadAll}
          size="lg"
          className="bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-food flex-1 sm:flex-initial"
        >
          <Download className="w-5 h-5 mr-2" />
          Download All (ZIP)
        </Button>
        <Button
          onClick={onEnhanceAnother}
          size="lg"
          variant="outline"
          className="border-primary/50 flex-1 sm:flex-initial"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Enhance Another Photo
        </Button>
      </div>
    </div>
  );
};

export default ResultsActions;
