import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
      </div>

      {/* Subtle Gold Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl">
          {/* Eyebrow Text */}
          <p className="text-amber-500 uppercase tracking-[0.3em] text-sm font-light mb-8">
            Elevate Your Culinary Presentation
          </p>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-white mb-8 leading-[1.1] tracking-tight">
            Where Every
            <br />
            <span className="font-serif italic text-amber-100">Dish</span>
            <br />
            Becomes Art
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-white/70 font-light max-w-xl mb-12 leading-relaxed">
            Transform your culinary creations into stunning visual masterpieces
            worthy of the world's finest establishments.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-start gap-6 mb-16">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-black font-medium text-base px-10 py-7 rounded-none tracking-wide transition-all duration-300 group"
            >
              Begin Transformation
              <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 font-light text-base px-10 py-7 rounded-none tracking-wide"
            >
              <Play className="w-4 h-4 mr-3" />
              View Showcase
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="border-t border-white/10 pt-10">
            <p className="text-white/40 text-sm uppercase tracking-widest mb-6">
              Trusted by leading establishments
            </p>
            <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
              <span className="text-white/60 text-lg font-light tracking-wide">The Ritz-Carlton</span>
              <span className="text-white/40">|</span>
              <span className="text-white/60 text-lg font-light tracking-wide">Nobu</span>
              <span className="text-white/40">|</span>
              <span className="text-white/60 text-lg font-light tracking-wide">Eleven Madison Park</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side Stats */}
      <div className="hidden lg:flex absolute right-20 top-1/2 -translate-y-1/2 flex-col gap-12">
        <div className="text-right">
          <div className="text-5xl font-light text-white mb-2">3</div>
          <div className="text-white/50 text-sm uppercase tracking-widest">Curated<br />Variations</div>
        </div>
        <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent mx-auto" />
        <div className="text-right">
          <div className="text-5xl font-light text-white mb-2">4K</div>
          <div className="text-white/50 text-sm uppercase tracking-widest">Ultra High<br />Resolution</div>
        </div>
        <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent mx-auto" />
        <div className="text-right">
          <div className="text-5xl font-light text-white mb-2">60</div>
          <div className="text-white/50 text-sm uppercase tracking-widest">Seconds<br />Delivery</div>
        </div>
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <span className="text-white/40 text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent" />
      </div>
    </section>
  );
};

export default Hero;
