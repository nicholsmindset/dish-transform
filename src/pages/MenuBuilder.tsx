import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Copy, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Menu {
  id: string;
  name: string;
  template: string;
  is_published: boolean;
  created_at: string;
}

export default function MenuBuilder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [newMenuName, setNewMenuName] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    await loadMenus(session.user.id);
  };

  const loadMenus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMenus(data || []);
    } catch (error: any) {
      toast.error("Failed to load menus");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMenu = async () => {
    const trimmedName = newMenuName.trim();

    if (!trimmedName) {
      toast.error("Please enter a menu name");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Menu name must be at least 2 characters");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Menu name must be less than 100 characters");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('menus')
        .insert({
          user_id: user.id,
          name: trimmedName,
          template: 'grid',
          public_url: `${user.id}-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Menu created!");
      setNewMenuName("");
      navigate(`/menu/${data.id}`);
    } catch (error: any) {
      toast.error("Failed to create menu");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateMenu = async (menu: Menu, e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicating(menu.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create duplicate menu
      const { data: newMenu, error: menuError } = await supabase
        .from('menus')
        .insert({
          user_id: user.id,
          name: `${menu.name} (Copy)`,
          template: menu.template,
          is_published: false,
          public_url: `${user.id}-${Date.now()}`,
        })
        .select()
        .single();

      if (menuError) throw menuError;

      // Get menu items from original menu
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('menu_id', menu.id);

      if (itemsError) throw itemsError;

      // Duplicate menu items if any exist
      if (items && items.length > 0) {
        const duplicatedItems = items.map(item => ({
          menu_id: newMenu.id,
          enhanced_photo_id: item.enhanced_photo_id,
          dish_name: item.dish_name,
          description: item.description,
          price: item.price,
          section: item.section,
          position: item.position,
        }));

        const { error: insertError } = await supabase
          .from('menu_items')
          .insert(duplicatedItems);

        if (insertError) throw insertError;
      }

      toast.success(`Menu duplicated as "${newMenu.name}"`);
      setMenus(prev => [newMenu, ...prev]);
    } catch (error: any) {
      toast.error("Failed to duplicate menu");
      console.error(error);
    } finally {
      setDuplicating(null);
    }
  };

  const handleDeleteMenu = async () => {
    if (!menuToDelete) return;

    try {
      // Delete menu items first (cascade)
      await supabase
        .from('menu_items')
        .delete()
        .eq('menu_id', menuToDelete.id);

      // Delete menu
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', menuToDelete.id);

      if (error) throw error;

      toast.success("Menu deleted");
      setMenus(prev => prev.filter(m => m.id !== menuToDelete.id));
    } catch (error: any) {
      toast.error("Failed to delete menu");
      console.error(error);
    } finally {
      setMenuToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-8">Menu Builder</h1>

        {/* Create New Menu */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Menu</h2>
            <div className="flex gap-4">
              <Input
                placeholder="Enter menu name (e.g., Lunch Menu, Dinner Specials)"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateMenu()}
                className="flex-1"
              />
              <Button onClick={handleCreateMenu} disabled={creating}>
                <Plus className="w-4 h-4 mr-2" />
                Create Menu
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Menu List */}
        {menus.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No menus yet</p>
            <p className="text-sm text-muted-foreground">Create your first menu to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menus.map((menu) => (
              <Card
                key={menu.id}
                className="cursor-pointer hover:shadow-lg transition-shadow relative group"
                onClick={() => navigate(`/menu/${menu.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg mb-2">{menu.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleDuplicateMenu(menu, e)}
                          disabled={duplicating === menu.id}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          {duplicating === menu.id ? 'Duplicating...' : 'Duplicate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuToDelete(menu);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {menu.template} • {menu.is_published ? 'Published' : 'Draft'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(menu.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!menuToDelete} onOpenChange={() => setMenuToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Menu</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{menuToDelete?.name}"? This will also delete all menu items. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMenu}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
