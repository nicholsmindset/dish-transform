import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogOut, Plus, Search, Menu, Image as ImageIcon, Shield } from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";

interface PhotoLibraryItem {
  id: string;
  original_image_url: string;
  dish_name: string | null;
  created_at: string;
  enhanced_photos: Array<{
    id: string;
    style_name: string;
    image_url: string;
  }>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<PhotoLibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // TEMP: Skip auth for preview - remove this block for production
    const PREVIEW_MODE = true;
    if (PREVIEW_MODE) {
      setLoading(false);
      // Mock data for preview
      setPhotos([
        {
          id: "1",
          original_image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
          dish_name: "Grilled Salmon",
          created_at: new Date().toISOString(),
          enhanced_photos: [
            { id: "1a", style_name: "Clean White", image_url: "" },
            { id: "1b", style_name: "Rustic", image_url: "" },
            { id: "1c", style_name: "Dark Moody", image_url: "" },
          ],
        },
        {
          id: "2",
          original_image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
          dish_name: "Margherita Pizza",
          created_at: new Date().toISOString(),
          enhanced_photos: [
            { id: "2a", style_name: "Clean White", image_url: "" },
            { id: "2b", style_name: "Rustic", image_url: "" },
          ],
        },
        {
          id: "3",
          original_image_url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
          dish_name: "Pancakes with Berries",
          created_at: new Date().toISOString(),
          enhanced_photos: [],
        },
      ]);
      return;
    }
    // END TEMP

    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    loadPhotos(session.user.id);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadPhotos(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  };

  const loadPhotos = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('photo_library')
        .select(`
          id,
          original_image_url,
          dish_name,
          created_at,
          enhanced_photos (
            id,
            style_name,
            image_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      toast.error("Failed to load photos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filteredPhotos = photos.filter(photo =>
    photo.dish_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-secondary/10">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              MenuVisuals
            </h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/batch")}>
                Batch Upload
              </Button>
              <Button variant="ghost" onClick={() => navigate("/menu")}>
                <Menu className="w-4 h-4 mr-2" />
                My Menus
              </Button>
              <Button variant="ghost" onClick={() => navigate("/settings")}>
                Settings
              </Button>
              {isAdmin && (
                <Button variant="ghost" onClick={() => navigate("/admin")}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by dish name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={() => navigate("/")}>
            <Plus className="w-4 h-4 mr-2" />
            Enhance New Photo
          </Button>
        </div>

        {/* Photo Gallery */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your photos...</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No photos yet</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No photos match your search" : "Start by enhancing your first food photo"}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate("/")}>
                <Plus className="w-4 h-4 mr-2" />
                Enhance Photo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotos.map((photo) => (
              <Card 
                key={photo.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/photo/${photo.id}`)}
              >
                <CardContent className="p-4">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3">
                    <img
                      src={photo.original_image_url}
                      alt={photo.dish_name || "Food photo"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold mb-1">
                    {photo.dish_name || "Unnamed Dish"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {photo.enhanced_photos?.length || 0} variations • {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
