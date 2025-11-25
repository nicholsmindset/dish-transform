import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokensAdded, setTokensAdded] = useState<number>(0);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      toast({
        title: "Invalid session",
        description: "No payment session found",
        variant: "destructive",
      });
      navigate("/pricing");
      return;
    }

    verifyPayment(sessionId);
  }, [searchParams]);

  const verifyPayment = async (sessionId: string, attempt = 0) => {
    setIsVerifying(true);
    setVerificationError(null);

    try {
      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId },
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      setTokensAdded(data.tokensAdded || 0);

      toast({
        title: "Payment successful!",
        description: data.message || `${data.tokensAdded} tokens added to your account`,
      });
      setIsVerifying(false);
    } catch (error) {
      console.error('Verification error:', error);

      // Retry logic with exponential backoff
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        setRetryCount(attempt + 1);
        toast({
          title: "Retrying verification...",
          description: `Attempt ${attempt + 2} of ${MAX_RETRIES + 1}`,
        });
        setTimeout(() => verifyPayment(sessionId, attempt + 1), delay);
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to verify payment";
        setVerificationError(errorMessage);
        toast({
          title: "Verification failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsVerifying(false);
      }
    }
  };

  const handleRetry = () => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      setRetryCount(0);
      verifyPayment(sessionId, 0);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
          <p className="text-muted-foreground">Please wait while we confirm your purchase</p>
          {retryCount > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Retry attempt {retryCount} of {MAX_RETRIES}
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">!</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Verification Failed</h2>
          <p className="text-muted-foreground mb-6">{verificationError}</p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full" size="lg">
              Try Again
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full" size="lg">
              Go to Dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            If this issue persists, please contact support. Your payment may still have been processed.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <h1 
            onClick={() => navigate("/")}
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
          >
            MenuVisuals
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
        <Card className="p-12 text-center max-w-md bg-card/50 backdrop-blur-sm">
          <div className="w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-primary-foreground" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
          <p className="text-xl text-muted-foreground mb-8">
            {tokensAdded} tokens have been added to your account
          </p>

          <div className="space-y-4">
            <Button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90"
              size="lg"
            >
              Start Enhancing Photos
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              View Dashboard
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            Your tokens are ready to use. Each photo enhancement uses 1 token and generates 3 professional variations.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
