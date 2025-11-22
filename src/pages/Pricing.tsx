import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles, Zap, Rocket } from "lucide-react";

const TOKEN_PACKAGES = [
  {
    name: "Starter Pack",
    priceId: "price_1SWHKUDjNCv7xF61k4cyV8bH",
    tokens: 30,
    price: 29,
    description: "Perfect for small restaurants starting out",
    features: ["30 photo enhancements", "3 styles per photo", "High-quality 4K output", "24/7 support"],
    icon: Sparkles,
    gradient: "from-orange-500 to-amber-500",
  },
  {
    name: "Pro Pack",
    priceId: "price_1SWHKxDjNCv7xF61zfM3OKwY",
    tokens: 100,
    price: 79,
    description: "Ideal for growing restaurants",
    features: ["100 photo enhancements", "3 styles per photo", "High-quality 4K output", "Priority support", "Batch processing"],
    icon: Zap,
    gradient: "from-green-500 to-emerald-500",
    popular: true,
  },
  {
    name: "Business Pack",
    priceId: "price_1SWHLiDjNCv7xF61AYheH0Ts",
    tokens: 300,
    price: 199,
    description: "For restaurant chains",
    features: ["300 photo enhancements", "3 styles per photo", "High-quality 4K output", "Dedicated support", "Batch processing", "API access"],
    icon: Rocket,
    gradient: "from-primary to-accent",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);

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

  const handlePurchase = async (priceId: string, packageName: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase tokens",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoadingPackage(priceId);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
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
      <header className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            onClick={() => navigate("/")}
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
          >
            MenuVisuals
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="bg-gradient-hero text-primary-foreground px-4 py-2 rounded-full font-semibold">
                {tokenBalance} tokens
              </div>
            )}
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-foreground mb-4">
            Choose Your Token Package
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pay only for what you need. Each token = 1 photo enhancement with 3 professional variations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {TOKEN_PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            return (
              <Card 
                key={pkg.priceId}
                className={`relative p-8 bg-card/50 backdrop-blur-sm border-2 ${
                  pkg.popular ? 'border-primary shadow-food scale-105' : 'border-border'
                } hover:border-primary/60 transition-all`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-hero text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${pkg.gradient} flex items-center justify-center mb-6 mx-auto`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-center mb-2">{pkg.name}</h3>
                <p className="text-muted-foreground text-center mb-6">{pkg.description}</p>

                <div className="text-center mb-6">
                  <span className="text-5xl font-bold">${pkg.price}</span>
                  <div className="text-muted-foreground mt-2">{pkg.tokens} tokens</div>
                  <div className="text-sm text-accent mt-1">${(pkg.price / pkg.tokens).toFixed(2)} per token</div>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-5 h-5 text-accent flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePurchase(pkg.priceId, pkg.name)}
                  disabled={loadingPackage === pkg.priceId}
                  className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90"
                  size="lg"
                >
                  {loadingPackage === pkg.priceId ? "Processing..." : "Purchase Now"}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border">
              <div className="text-4xl font-bold text-primary mb-2">1</div>
              <h4 className="font-semibold mb-2">Purchase Tokens</h4>
              <p className="text-sm text-muted-foreground">Choose a package that fits your needs</p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border">
              <div className="text-4xl font-bold text-primary mb-2">2</div>
              <h4 className="font-semibold mb-2">Upload Photos</h4>
              <p className="text-sm text-muted-foreground">Each upload uses 1 token</p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border">
              <div className="text-4xl font-bold text-primary mb-2">3</div>
              <h4 className="font-semibold mb-2">Get 3 Versions</h4>
              <p className="text-sm text-muted-foreground">Receive professionally enhanced photos instantly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
