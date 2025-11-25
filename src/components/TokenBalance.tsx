import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TokenBalanceProps {
  compact?: boolean;
}

export function TokenBalance({ compact = false }: TokenBalanceProps) {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();

    // Subscribe to auth changes to reload tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadTokens();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTokens(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_tokens')
        .select('tokens')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setTokens(data?.tokens || 0);
    } catch (error) {
      console.error('Error loading tokens:', error);
      setTokens(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading || tokens === null) {
    return null;
  }

  const isLow = tokens < 5;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pricing')}
            className={isLow ? "text-red-500 hover:text-red-600" : ""}
          >
            <Coins className="w-4 h-4 mr-1" />
            {tokens}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tokens} token{tokens !== 1 ? 's' : ''} remaining</p>
          {isLow && <p className="text-red-400 text-xs">Low balance - click to buy more</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={isLow ? "destructive" : "outline"}
      size="sm"
      onClick={() => navigate('/pricing')}
    >
      <Coins className="w-4 h-4 mr-2" />
      {tokens} Token{tokens !== 1 ? 's' : ''}
      {isLow && " - Buy More"}
    </Button>
  );
}
