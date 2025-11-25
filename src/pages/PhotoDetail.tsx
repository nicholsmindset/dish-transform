import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PhotoDetail {
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

const SOCIAL_PLATFORMS = [
  { id: 'instagram_post', name: 'Instagram Post', size: '1080x1080' },
  { id: 'instagram_story', name: 'Instagram Story', size: '1080x1920' },
  { id: 'facebook_post', name: 'Facebook Post', size: '1200x630' },
  { id: 'twitter_post', name: 'Twitter/X Post', size: '1200x675' },
  { id: 'pinterest_pin', name: 'Pinterest Pin', size: '1000x1500' },
  { id: 'tiktok', name: 'TikTok', size: '1080x1920' },
];

export default function PhotoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [generatingSocial, setGeneratingSocial] = useState(false);

  useEffect(() => {
    checkAuthAndLoadPhoto();
  }, [id]);

  const checkAuthAndLoadPhoto = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view photos");
        navigate("/auth");
        return;
      }

      // Load photo with ownership verification
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
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error("Photo not found or access denied");
        } else {
          throw error;
        }
        navigate("/dashboard");
        return;
      }
      setPhoto(data);
    } catch (error: any) {
      toast.error("Failed to load photo");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Downloaded!");
    } catch (error) {
      toast.error("Failed to download");
    }
  };

  const handleGenerateSocial = async (enhancedPhotoId: string, imageUrl: string) => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setGeneratingSocial(true);
    try {
      const { data, error } = await supabase.functions.invoke('resize-for-social', {
        body: {
          imageUrl,
          platforms: selectedPlatforms,
          enhancedPhotoId
        }
      });

      if (error) throw error;
      toast.success(`Generated ${data.exports.length} social media versions!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate social media versions");
    } finally {
      setGeneratingSocial(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this photo and all its variations?")) {
      return;
    }

    try {
      // Get current user for ownership verification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to delete photos");
        navigate("/auth");
        return;
      }

      // Delete with ownership check
      const { error } = await supabase
        .from('photo_library')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success("Photo deleted");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Failed to delete photo");
    }
  };

  if (loading || !photo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          {photo.dish_name || "Unnamed Dish"}
        </h1>
        <p className="text-muted-foreground mb-8">
          Created {new Date(photo.created_at).toLocaleDateString()}
        </p>

        {/* Original Photo */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Original Photo</h2>
            <img
              src={photo.original_image_url}
              alt="Original"
              className="w-full max-w-2xl rounded-lg"
            />
          </CardContent>
        </Card>

        {/* Enhanced Variations */}
        <h2 className="text-2xl font-bold mb-4">Enhanced Variations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photo.enhanced_photos.map((enhanced) => (
            <Card key={enhanced.id}>
              <CardContent className="p-4">
                <img
                  src={enhanced.image_url}
                  alt={enhanced.style_name}
                  className="w-full aspect-[4/3] object-cover rounded-lg mb-4"
                />
                <h3 className="font-semibold mb-3">{enhanced.style_name}</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(enhanced.image_url, enhanced.style_name)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Share2 className="w-4 h-4 mr-2" />
                        Social
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Social Media Versions</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Select platforms to generate optimized versions:
                        </p>
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <div key={platform.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={platform.id}
                              checked={selectedPlatforms.includes(platform.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPlatforms([...selectedPlatforms, platform.id]);
                                } else {
                                  setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                                }
                              }}
                            />
                            <Label htmlFor={platform.id} className="flex-1">
                              {platform.name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({platform.size})
                              </span>
                            </Label>
                          </div>
                        ))}
                        <Button
                          onClick={() => handleGenerateSocial(enhanced.id, enhanced.image_url)}
                          disabled={generatingSocial || selectedPlatforms.length === 0}
                          className="w-full"
                        >
                          {generatingSocial ? "Generating..." : "Generate"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
