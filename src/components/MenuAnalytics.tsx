import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Eye, QrCode, Share2, TrendingUp } from "lucide-react";

interface MenuStats {
  totalViews: number;
  qrScans: number;
  shares: number;
  directViews: number;
  viewsToday: number;
  viewsThisWeek: number;
}

interface MenuAnalyticsProps {
  menuId: string;
}

export function MenuAnalytics({ menuId }: MenuAnalyticsProps) {
  const [stats, setStats] = useState<MenuStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [menuId]);

  const loadStats = async () => {
    try {
      // Get all views for this menu
      const { data: views, error } = await supabase
        .from('menu_views')
        .select('viewed_at, source')
        .eq('menu_id', menuId);

      if (error) throw error;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const allViews = views || [];
      const totalViews = allViews.length;
      const qrScans = allViews.filter(v => v.source === 'qr').length;
      const shares = allViews.filter(v => v.source === 'share').length;
      const directViews = allViews.filter(v => v.source === 'direct' || !v.source).length;

      const viewsToday = allViews.filter(v => {
        const viewDate = new Date(v.viewed_at || '');
        return viewDate >= today;
      }).length;

      const viewsThisWeek = allViews.filter(v => {
        const viewDate = new Date(v.viewed_at || '');
        return viewDate >= weekAgo;
      }).length;

      setStats({
        totalViews,
        qrScans,
        shares,
        directViews,
        viewsToday,
        viewsThisWeek,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-16" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Views",
      value: stats.totalViews,
      subtitle: `${stats.viewsToday} today`,
      icon: Eye,
      color: "text-blue-500",
    },
    {
      title: "QR Scans",
      value: stats.qrScans,
      subtitle: `${Math.round((stats.qrScans / (stats.totalViews || 1)) * 100)}% of views`,
      icon: QrCode,
      color: "text-purple-500",
    },
    {
      title: "Shared Links",
      value: stats.shares,
      subtitle: `${Math.round((stats.shares / (stats.totalViews || 1)) * 100)}% of views`,
      icon: Share2,
      color: "text-green-500",
    },
    {
      title: "This Week",
      value: stats.viewsThisWeek,
      subtitle: "Last 7 days",
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
