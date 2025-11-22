import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Menu {
  id: string;
  name: string;
  template: string;
  is_published: boolean;
}

interface MenuItem {
  id: string;
  enhanced_photo_id: string;
  dish_name: string;
  description: string | null;
  price: number | null;
  section: string | null;
  position: number;
  image_url?: string;
}

interface EnhancedPhoto {
  id: string;
  image_url: string;
  style_name: string;
  photo_library: {
    dish_name: string | null;
  };
}

function SortableMenuItem({ item, onUpdate, onDelete }: { item: MenuItem; onUpdate: (id: string, field: string, value: any) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-lg p-4 mb-3">
      <div className="flex gap-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
        </div>
        
        {item.image_url && (
          <img src={item.image_url} alt={item.dish_name} className="w-24 h-24 object-cover rounded" />
        )}
        
        <div className="flex-1 space-y-3">
          <Input
            value={item.dish_name}
            onChange={(e) => onUpdate(item.id, 'dish_name', e.target.value)}
            placeholder="Dish name"
            className="font-semibold"
          />
          <Textarea
            value={item.description || ''}
            onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
            placeholder="Description"
            className="min-h-[60px]"
          />
          <div className="flex gap-3">
            <Input
              type="number"
              step="0.01"
              value={item.price || ''}
              onChange={(e) => onUpdate(item.id, 'price', parseFloat(e.target.value))}
              placeholder="Price"
              className="w-32"
            />
            <Select value={item.section || ''} onValueChange={(value) => onUpdate(item.id, 'section', value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appetizers">Appetizers</SelectItem>
                <SelectItem value="mains">Mains</SelectItem>
                <SelectItem value="desserts">Desserts</SelectItem>
                <SelectItem value="drinks">Drinks</SelectItem>
                <SelectItem value="specials">Specials</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function MenuEditor() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [availablePhotos, setAvailablePhotos] = useState<EnhancedPhoto[]>([]);
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadMenuData();
  }, [menuId]);

  const loadMenuData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load menu
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .select('*')
        .eq('id', menuId)
        .single();

      if (menuError) throw menuError;
      setMenu(menuData);

      // Load menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          enhanced_photos!inner(image_url)
        `)
        .eq('menu_id', menuId)
        .order('position', { ascending: true });

      if (itemsError) throw itemsError;
      
      const formattedItems = (itemsData || []).map((item: any) => ({
        ...item,
        image_url: item.enhanced_photos?.image_url
      }));
      setMenuItems(formattedItems);

      // Load available photos
      const { data: photosData, error: photosError } = await supabase
        .from('enhanced_photos')
        .select(`
          id,
          image_url,
          style_name,
          photo_library!inner(dish_name, user_id)
        `)
        .eq('photo_library.user_id', user.id)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;
      setAvailablePhotos(photosData || []);
    } catch (error: any) {
      toast.error("Failed to load menu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddPhoto = async (photo: EnhancedPhoto) => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          menu_id: menuId,
          enhanced_photo_id: photo.id,
          dish_name: photo.photo_library.dish_name || 'Untitled Dish',
          position: menuItems.length,
        })
        .select()
        .single();

      if (error) throw error;

      setMenuItems([...menuItems, { ...data, image_url: photo.image_url }]);
      toast.success("Photo added to menu");
      setShowPhotoLibrary(false);
    } catch (error: any) {
      toast.error("Failed to add photo");
      console.error(error);
    }
  };

  const handleUpdateItem = (id: string, field: string, value: any) => {
    setMenuItems(menuItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMenuItems(menuItems.filter(item => item.id !== id));
      toast.success("Item removed");
    } catch (error: any) {
      toast.error("Failed to remove item");
      console.error(error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update positions and details for all items
      const updates = menuItems.map((item, index) => ({
        id: item.id,
        dish_name: item.dish_name,
        description: item.description,
        price: item.price,
        section: item.section,
        position: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('menu_items')
          .update(update)
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success("Menu saved successfully");
    } catch (error: any) {
      toast.error("Failed to save menu");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      const { error } = await supabase
        .from('menus')
        .update({ is_published: !menu?.is_published })
        .eq('id', menuId);

      if (error) throw error;

      setMenu(menu ? { ...menu, is_published: !menu.is_published } : null);
      toast.success(menu?.is_published ? "Menu unpublished" : "Menu published");
    } catch (error: any) {
      toast.error("Failed to update menu");
      console.error(error);
    }
  };

  const handleTemplateChange = async (template: string) => {
    try {
      const { error } = await supabase
        .from('menus')
        .update({ template })
        .eq('id', menuId);

      if (error) throw error;

      setMenu(menu ? { ...menu, template } : null);
      toast.success("Template updated");
    } catch (error: any) {
      toast.error("Failed to update template");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/menu")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menus
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{menu?.name}</h1>
              <p className="text-sm text-muted-foreground">
                {menu?.is_published ? 'Published' : 'Draft'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Select value={menu?.template} onValueChange={handleTemplateChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid Layout</SelectItem>
                <SelectItem value="list">List Layout</SelectItem>
                <SelectItem value="elegant">Elegant Layout</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleTogglePublish}>
              <Eye className="w-4 h-4 mr-2" />
              {menu?.is_published ? 'Unpublish' : 'Publish'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Photo Library */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Photo Library</h2>
              <Button 
                onClick={() => setShowPhotoLibrary(!showPhotoLibrary)}
                variant="outline"
                className="w-full mb-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Photos
              </Button>

              {showPhotoLibrary && (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {availablePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleAddPhoto(photo)}
                    >
                      <img
                        src={photo.image_url}
                        alt={photo.photo_library.dish_name || 'Dish'}
                        className="w-full aspect-square object-cover rounded"
                      />
                      <p className="text-xs mt-1 text-muted-foreground truncate">
                        {photo.photo_library.dish_name || 'Untitled'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Editor */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Menu Items</h2>
                  <p className="text-sm text-muted-foreground">
                    {menuItems.length} {menuItems.length === 1 ? 'item' : 'items'}
                  </p>
                </div>

                {menuItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-2">No items yet</p>
                    <p className="text-sm text-muted-foreground">
                      Click "Add Photos" to add dishes to your menu
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={menuItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {menuItems.map((item) => (
                        <SortableMenuItem
                          key={item.id}
                          item={item}
                          onUpdate={handleUpdateItem}
                          onDelete={handleDeleteItem}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
