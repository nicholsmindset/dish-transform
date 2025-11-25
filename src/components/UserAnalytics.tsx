import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Camera, FileText, Coins, TrendingUp } from "lucide-react";

interface UserStats {
  totalPhotos: number;
  totalEnhanced: number;
  totalMenus: number;
  publishedMenus: number;
  tokensUsed: number;
  tokensRemaining: number;
}

export function UserAnalytics({ userId }: { userId: string }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      // Fetch all stats in parallel
      const [photosResult, enhancedResult, menusResult, tokensResult, usageResult] = await Promise.all([
        supabase.from('photo_library').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('enhanced_photos').select('id, photo_library!inner(user_id)', { count: 'exact', head: true }).eq('photo_library.user_id', userId),
        supabase.from('menus').select('id, is_published').eq('user_id', userId),
        supabase.from('user_tokens').select('tokens').eq('user_id', userId).maybeSingle(),
        supabase.from('token_usage').select('tokens_used').eq('user_id', userId),
      ]);

      const totalPhotos = photosResult.count || 0;
      const totalEnhanced = enhancedResult.count || 0;
      const menus = menusResult.data || [];
      const totalMenus = menus.length;
      const publishedMenus = menus.filter(m => m.is_published).length;
      const tokensRemaining = tokensResult.data?.tokens || 0;
      const tokensUsed = (usageResult.data || []).reduce((sum, u) => sum + (u.tokens_used || 0), 0);

      setStats({
        totalPhotos,
        totalEnhanced,
        totalMenus,
        publishedMenus,
        tokensUsed,
        tokensRemaining,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Photos",
      value: stats.totalPhotos,
      subtitle: `${stats.totalEnhanced} enhanced`,
      icon: Camera,
      color: "text-blue-500",
    },
    {
      title: "Menus",
      value: stats.totalMenus,
      subtitle: `${stats.publishedMenus} published`,
      icon: FileText,
      color: "text-green-500",
    },
    {
      title: "Tokens Used",
      value: stats.tokensUsed,
      subtitle: `${stats.tokensRemaining} remaining`,
      icon: TrendingUp,
      color: "text-orange-500",
    },
    {
      title: "Token Balance",
      value: stats.tokensRemaining,
      subtitle: stats.tokensRemaining < 5 ? "Low balance!" : "Available",
      icon: Coins,
      color: stats.tokensRemaining < 5 ? "text-red-500" : "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
