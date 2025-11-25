import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogOut, Plus, Search, Menu, Image as ImageIcon, Shield, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { UserAnalytics } from "@/components/UserAnalytics";
import { TokenBalance } from "@/components/TokenBalance";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PhotoGridSkeleton } from "@/components/PhotoCardSkeleton";

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

const PHOTOS_PER_PAGE = 12;

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<PhotoLibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
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

  const loadPhotos = async (userId: string, page: number = 1) => {
    try {
      // Get total count first
      const { count, error: countError } = await supabase
        .from('photo_library')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get paginated data
      const start = (page - 1) * PHOTOS_PER_PAGE;
      const end = start + PHOTOS_PER_PAGE - 1;

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
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      toast.error("Failed to load photos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (user) {
      setCurrentPage(newPage);
      setLoading(true);
      loadPhotos(user.id, newPage);
    }
  };

  const handleDeletePhoto = async (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation(); // Prevent navigating to photo detail

    if (!confirm("Are you sure you want to delete this photo and all its variations?")) {
      return;
    }

    setDeleting(photoId);
    try {
      const { error } = await supabase
        .from('photo_library')
        .delete()
        .eq('id', photoId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success("Photo deleted");
      // Reload current page
      if (user) {
        loadPhotos(user.id, currentPage);
      }
    } catch (error: any) {
      toast.error("Failed to delete photo");
      console.error(error);
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PHOTOS_PER_PAGE);

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
              <TokenBalance compact />
              <ThemeToggle />
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* User Analytics */}
        {user && <UserAnalytics userId={user.id} />}

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by dish name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {totalCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {totalCount} photo{totalCount !== 1 ? 's' : ''} total
              </span>
            )}
          </div>
          <Button onClick={() => navigate("/")}>
            <Plus className="w-4 h-4 mr-2" />
            Enhance New Photo
          </Button>
        </div>

        {/* Photo Gallery */}
        {loading ? (
          <PhotoGridSkeleton count={8} />
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPhotos.map((photo) => (
                <Card
                  key={photo.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow group relative"
                  onClick={() => navigate(`/photo/${photo.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3 relative">
                      <img
                        src={photo.original_image_url}
                        alt={photo.dish_name || "Food photo"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeletePhoto(e, photo.id)}
                        disabled={deleting === photo.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
