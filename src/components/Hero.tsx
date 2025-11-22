import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, Clock, Star, Check } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-warm">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <Badge className="bg-gradient-hero text-primary-foreground px-6 py-2 text-sm font-semibold shadow-warm">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Enhancement
            </Badge>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-center mb-6 text-foreground leading-tight">
            Turn iPhone Photos Into
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Pro Food Photography
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-center text-muted-foreground max-w-3xl mx-auto mb-10">
            Upload your raw food photo. Get 3 professional versions for delivery apps and menus.
            <br />
            <span className="text-primary font-semibold">No photographer needed.</span>
          </p>

          {/* CTA Button */}
          <div className="flex justify-center mb-12">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-gradient-hero text-primary-foreground hover:opacity-90 shadow-food text-lg px-10 py-6 rounded-full transition-all hover:scale-105"
            >
              <Upload className="w-5 h-5 mr-2" />
              Enhance Your Photo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-warm border border-border">
              <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">3</div>
              <div className="text-muted-foreground">Pro Versions</div>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-warm border border-border">
              <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">60s</div>
              <div className="text-muted-foreground">Processing</div>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-warm border border-border">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">4K</div>
              <div className="text-muted-foreground">Menu-Ready</div>
            </div>
          </div>

          {/* Use case badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {["UberEats", "DoorDash", "Grubhub", "Restaurant Websites", "Social Media", "Print Menus"].map((platform) => (
              <Badge key={platform} variant="outline" className="px-4 py-2 text-sm border-primary/30 bg-background/50 backdrop-blur-sm">
                Perfect for {platform}
              </Badge>
            ))}
          </div>

          {/* Value proposition */}
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              Professional photographers charge <span className="line-through">$200-500</span> per dish
            </p>
            <p className="text-2xl font-bold text-primary">
              We do it for $2.63
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
