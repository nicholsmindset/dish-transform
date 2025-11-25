import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MenuTemplate } from "@/components/MenuTemplates";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, Printer } from "lucide-react";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  dish_name: string;
  description: string | null;
  price: number | null;
  section: string | null;
  image_url: string;
  enhanced_photos: {
    image_url: string;
  };
}

interface Menu {
  name: string;
  template: string;
}

export default function PublicMenu() {
  const { menuId } = useParams();
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadMenu();
    trackView();
  }, [menuId]);

  // Track menu view
  const trackView = async () => {
    if (!menuId) return;

    // Determine source from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('src') || 'direct'; // 'qr', 'share', 'embed', or 'direct'

    try {
      await supabase.from('menu_views').insert({
        menu_id: menuId,
        source: source,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
      });
    } catch (error) {
      // Silently fail - don't disrupt user experience for analytics
      console.debug('View tracking failed:', error);
    }
  };

  // Update document title when menu loads
  useEffect(() => {
    if (menu) {
      document.title = `${menu.name} | MenuVisuals`;
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', `View the menu for ${menu.name}. Browse our delicious offerings.`);
      }
    }
    return () => {
      document.title = 'MenuVisuals';
    };
  }, [menu]);

  // Generate URL with source tracking
  const getShareUrl = (source: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('src', source);
    return url.toString();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl('share'));
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share && menu) {
      try {
        await navigator.share({
          title: menu.name,
          text: `Check out the menu for ${menu.name}`,
          url: getShareUrl('share'),
        });
      } catch (error) {
        // User cancelled or share failed, fall back to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const loadMenu = async () => {
    try {
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .select('name, template')
        .eq('id', menuId)
        .eq('is_published', true)
        .single();

      if (menuError) {
        if (menuError.code === 'PGRST116') {
          setNotFound(true);
        }
        throw menuError;
      }
      setMenu(menuData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          id,
          dish_name,
          description,
          price,
          section,
          enhanced_photo_id,
          enhanced_photos(image_url)
        `)
        .eq('menu_id', menuId)
        .order('position', { ascending: true });

      if (itemsError) throw itemsError;

      const formattedItems = (itemsData || []).map((item: any) => ({
        id: item.id,
        dish_name: item.dish_name,
        description: item.description,
        price: item.price,
        section: item.section,
        image_url: item.enhanced_photos?.image_url || '',
        enhanced_photos: item.enhanced_photos
      }));
      setItems(formattedItems);
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    const section = item.section || 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading menu...</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Menu Not Found</h1>
          <p className="text-muted-foreground mb-4">
            {notFound
              ? "This menu doesn't exist or hasn't been published yet."
              : "There was an error loading the menu."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-secondary/10">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            {menu.name}
          </h1>
          <p className="text-muted-foreground mb-4">Our delicious offerings</p>
          <div className="flex justify-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Menu
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>

        <MenuTemplate template={menu.template} items={items} groupedItems={groupedItems} />

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by MenuVisuals</p>
        </footer>
      </div>
    </div>
  );
}
