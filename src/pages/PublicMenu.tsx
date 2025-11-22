import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MenuTemplate } from "@/components/MenuTemplates";

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

  useEffect(() => {
    loadMenu();
  }, [menuId]);

  const loadMenu = async () => {
    try {
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .select('name, template')
        .eq('id', menuId)
        .eq('is_published', true)
        .single();

      if (menuError) throw menuError;
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
        <p className="text-muted-foreground">Menu not found</p>
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
          <p className="text-muted-foreground">Our delicious offerings</p>
        </div>

        <MenuTemplate template={menu.template} items={items} groupedItems={groupedItems} />
      </div>
    </div>
  );
}
