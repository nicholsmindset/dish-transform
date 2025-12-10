import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Check,
  Sparkles,
  Zap,
  Rocket,
  Image,
  Package,
  Utensils,
  Store,
  Clock,
  RefreshCw,
  Edit3,
  Share2,
  Crown
} from "lucide-react";

// A La Carte packages (SGD pricing)
const A_LA_CARTE_PACKAGES = [
  {
    name: "Single Image",
    priceId: "price_single_image",
    images: 1,
    priceMin: 15,
    priceMax: 20,
    description: "Perfect for quick updates",
    features: ["1 professional enhancement", "3 style variations", "4K quality output"],
    icon: Image,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "5-Image Pack",
    priceId: "price_5_pack",
    images: 5,
    priceMin: 60,
    priceMax: 75,
    description: "Ideal for menu sections",
    features: ["5 enhanced images", "3 styles each", "Batch processing", "20% savings"],
    icon: Package,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "10-Image Pack",
    priceId: "price_10_pack",
    images: 10,
    priceMin: 100,
    priceMax: 120,
    description: "Best for seasonal updates",
    features: ["10 enhanced images", "3 styles each", "Batch processing", "33% savings"],
    icon: Utensils,
    gradient: "from-orange-500 to-amber-500",
    popular: true,
  },
  {
    name: "Full Menu Makeover",
    priceId: "price_menu_makeover",
    images: 30,
    priceMin: 250,
    priceMax: 300,
    description: "Complete menu transformation",
    features: ["Up to 30 images", "All styles included", "Priority processing", "Menu builder access"],
    icon: Sparkles,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    name: "Delivery Platform Refresh",
    priceId: "price_delivery_refresh",
    images: 20,
    priceMin: 180,
    priceMax: 200,
    description: "GrabFood/Deliveroo/FoodPanda",
    features: ["Up to 20 images", "Platform-optimized sizes", "Social export included", "Listing enhancement"],
    icon: Store,
    gradient: "from-red-500 to-rose-500",
  },
];

// Subscription packages (SGD monthly pricing)
const SUBSCRIPTION_PACKAGES = [
  {
    name: "Starter",
    priceId: "price_sub_starter",
    tier: "starter",
    imagesPerMonth: 10,
    socialPosts: 0,
    priceMin: 80,
    priceMax: 100,
    description: "For small restaurants",
    features: [
      "10 enhanced images/month",
      "3 style variations each",
      "Locked-in pricing",
      "Rollover up to 5 images",
      "Free re-edits",
      "48hr turnaround",
    ],
    icon: Sparkles,
    gradient: "from-orange-500 to-amber-500",
  },
  {
    name: "Growth",
    priceId: "price_sub_growth",
    tier: "growth",
    imagesPerMonth: 20,
    socialPosts: 2,
    priceMin: 150,
    priceMax: 180,
    description: "For growing businesses",
    features: [
      "20 enhanced images/month",
      "2 social media posts",
      "3 style variations each",
      "Locked-in pricing",
      "Rollover up to 5 images",
      "Free re-edits",
      "48hr turnaround",
    ],
    icon: Zap,
    gradient: "from-green-500 to-emerald-500",
    popular: true,
  },
  {
    name: "Premium",
    priceId: "price_sub_premium",
    tier: "premium",
    imagesPerMonth: 40,
    socialPosts: 4,
    priceMin: 280,
    priceMax: 350,
    description: "For restaurant chains",
    features: [
      "40 enhanced images/month",
      "4 social media posts",
      "3 style variations each",
      "Locked-in pricing",
      "Rollover up to 5 images",
      "Free re-edits",
      "24hr priority turnaround",
      "Dedicated support",
    ],
    icon: Rocket,
    gradient: "from-primary to-accent",
    recommended: true,
  },
];

const SUBSCRIPTION_PERKS = [
  { icon: Clock, title: "Priority Turnaround", description: "24hrs for Premium, 48hrs for others" },
  { icon: RefreshCw, title: "Rollover Images", description: "Unused images roll over (max 5)" },
  { icon: Edit3, title: "Free Re-edits", description: "Not happy? We'll redo it for free" },
  { icon: Crown, title: "Locked-in Pricing", description: "Your rate never increases" },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("subscriptions");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchTokenBalance();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchTokenBalance();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTokenBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-tokens');
      if (error) throw error;
      setTokenBalance(data.tokens || 0);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const handlePurchase = async (priceId: string, purchaseType: 'one_time' | 'subscription') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoadingPackage(priceId);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, purchaseType },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Purchase failed",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoadingPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1
            onClick={() => navigate("/")}
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
          >
            Dish Transform
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="bg-gradient-hero text-primary-foreground px-4 py-2 rounded-full font-semibold">
                {tokenBalance} credits
              </div>
            )}
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Professional Food Photography
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your dish photos into stunning, appetizing images that drive orders
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="subscriptions" className="text-base">
              Monthly Plans
            </TabsTrigger>
            <TabsTrigger value="a-la-carte" className="text-base">
              A La Carte
            </TabsTrigger>
          </TabsList>

          {/* Subscription Plans */}
          <TabsContent value="subscriptions" className="space-y-8">
            {/* Subscription Perks Banner */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-center mb-6">All Subscription Plans Include</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SUBSCRIPTION_PERKS.map((perk, i) => (
                  <div key={i} className="flex flex-col items-center text-center p-3">
                    <perk.icon className="w-8 h-8 text-primary mb-2" />
                    <span className="font-medium text-sm">{perk.title}</span>
                    <span className="text-xs text-muted-foreground">{perk.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUBSCRIPTION_PACKAGES.map((pkg) => {
                const Icon = pkg.icon;
                return (
                  <Card
                    key={pkg.priceId}
                    className={`relative p-6 bg-card/50 backdrop-blur-sm border-2 ${
                      pkg.popular ? 'border-primary shadow-food scale-105 z-10' : 'border-border'
                    } ${pkg.recommended ? 'ring-2 ring-accent ring-offset-2' : ''} hover:border-primary/60 transition-all`}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Most Popular
                      </Badge>
                    )}
                    {pkg.recommended && (
                      <Badge className="absolute -top-3 right-4 bg-accent">
                        Best Value
                      </Badge>
                    )}

                    <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${pkg.gradient} flex items-center justify-center mb-4 mx-auto`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-xl font-bold text-center mb-1">{pkg.name}</h3>
                    <p className="text-muted-foreground text-center text-sm mb-4">{pkg.description}</p>

                    <div className="text-center mb-4">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-lg text-muted-foreground">S$</span>
                        <span className="text-4xl font-bold">{pkg.priceMin}</span>
                        <span className="text-muted-foreground">–{pkg.priceMax}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">per month</div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 mb-4 text-center">
                      <span className="text-2xl font-bold text-primary">{pkg.imagesPerMonth}</span>
                      <span className="text-sm text-muted-foreground ml-1">images/month</span>
                      {pkg.socialPosts > 0 && (
                        <div className="text-sm text-accent mt-1">
                          + {pkg.socialPosts} social posts
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handlePurchase(pkg.priceId, 'subscription')}
                      disabled={loadingPackage === pkg.priceId}
                      className={`w-full ${pkg.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                      size="lg"
                    >
                      {loadingPackage === pkg.priceId ? "Processing..." : "Subscribe Now"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* A La Carte Options */}
          <TabsContent value="a-la-carte" className="space-y-8">
            <div className="text-center mb-6">
              <p className="text-muted-foreground">
                No commitment needed. Pay only for what you need.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {A_LA_CARTE_PACKAGES.map((pkg) => {
                const Icon = pkg.icon;
                return (
                  <Card
                    key={pkg.priceId}
                    className={`relative p-6 bg-card/50 backdrop-blur-sm border-2 ${
                      pkg.popular ? 'border-primary shadow-food' : 'border-border'
                    } hover:border-primary/60 transition-all`}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Best Seller
                      </Badge>
                    )}

                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${pkg.gradient} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-lg font-bold mb-1">{pkg.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{pkg.description}</p>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-muted-foreground">S$</span>
                        <span className="text-3xl font-bold">{pkg.priceMin}</span>
                        <span className="text-muted-foreground">–{pkg.priceMax}</span>
                      </div>
                      <div className="text-sm text-accent mt-1">
                        {pkg.images} image{pkg.images > 1 ? 's' : ''} • S${(pkg.priceMin / pkg.images).toFixed(0)}/image
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-accent flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handlePurchase(pkg.priceId, 'one_time')}
                      disabled={loadingPackage === pkg.priceId}
                      variant={pkg.popular ? "default" : "outline"}
                      className="w-full"
                    >
                      {loadingPackage === pkg.priceId ? "Processing..." : "Purchase"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* How It Works */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h4 className="font-semibold mb-2">Upload</h4>
              <p className="text-sm text-muted-foreground">Upload your dish photo from any device</p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h4 className="font-semibold mb-2">AI Enhancement</h4>
              <p className="text-sm text-muted-foreground">Our AI transforms your photo professionally</p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h4 className="font-semibold mb-2">3 Variations</h4>
              <p className="text-sm text-muted-foreground">Get 3 professional style options</p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">4</span>
              </div>
              <h4 className="font-semibold mb-2">Download</h4>
              <p className="text-sm text-muted-foreground">Download in 4K or export for social</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div className="bg-card/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">What happens to unused subscription images?</h4>
              <p className="text-sm text-muted-foreground">
                Unused images roll over to the next month (up to 5 images max). This perk is exclusive to subscribers.
              </p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Can I cancel my subscription anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can cancel anytime. You'll keep access until the end of your billing period.
              </p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">What's included in a "social post"?</h4>
              <p className="text-sm text-muted-foreground">
                Social posts include optimized image exports for Instagram, Facebook, and other platforms with the correct dimensions.
              </p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">What's the turnaround time?</h4>
              <p className="text-sm text-muted-foreground">
                Premium subscribers get 24-hour priority turnaround. All other plans have 48-hour turnaround. A la carte orders are processed within 48-72 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
