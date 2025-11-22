import { useEffect, useState } from "react";
import { Sparkles, Pizza, Coffee } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface LoadingStateProps {
  currentPhoto: string;
  completedCount: number;
}

const LoadingState = ({ currentPhoto, completedCount }: LoadingStateProps) => {
  const [tipIndex, setTipIndex] = useState(0);

  const tips = [
    "We're preserving your dish exactly as photographed",
    "Just changing the background and lighting",
    "Creating 3 professional settings for you",
    "Menu-ready quality in seconds",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const progress = (completedCount / 3) * 100;

  return (
    <div className="min-h-[600px] flex items-center justify-center py-20">
      <div className="max-w-2xl mx-auto text-center px-4">
        {/* Animated icons */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="animate-bounce" style={{ animationDelay: "0ms" }}>
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <div className="animate-bounce" style={{ animationDelay: "200ms" }}>
            <Pizza className="w-12 h-12 text-accent" />
          </div>
          <div className="animate-bounce" style={{ animationDelay: "400ms" }}>
            <Coffee className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Main message */}
        <h2 className="text-4xl font-bold text-foreground mb-4">
          Enhancing Your Photo...
        </h2>

        {/* Current step */}
        <p className="text-xl text-muted-foreground mb-8">{currentPhoto}</p>

        {/* Progress bar */}
        <div className="max-w-md mx-auto mb-6">
          <Progress value={progress} className="h-3 bg-muted" />
          <p className="text-sm text-muted-foreground mt-2">
            {completedCount}/3 photos complete
          </p>
        </div>

        {/* Rotating tips */}
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border shadow-warm">
          <p className="text-lg text-foreground font-medium animate-fade-in">
            💡 {tips[tipIndex]}
          </p>
        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
