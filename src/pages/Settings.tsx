import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface BrandSettings {
  restaurant_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  default_style: string;
  watermark_enabled: boolean;
}

const FONT_OPTIONS = ['Inter', 'Playfair Display', 'Montserrat', 'Lora', 'Poppins', 'Roboto'];
const STYLE_OPTIONS = ['Clean White Background', 'Rustic Table Setting', 'Dark Moody Background'];

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BrandSettings>({
    restaurant_name: '',
    logo_url: '',
    primary_color: '#ea580c',
    secondary_color: '#15803d',
    font_family: 'Inter',
    default_style: 'Clean White Background',
    watermark_enabled: false,
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    await loadSettings(session.user.id);
  };

  const loadSettings = async (userId: string) => {
    try {
      const [profileResult, brandResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('brand_settings').select('*').eq('user_id', userId).maybeSingle()
      ]);

      if (profileResult.data) {
        setSettings(prev => ({
          ...prev,
          restaurant_name: profileResult.data.restaurant_name || '',
        }));
      }

      if (brandResult.data) {
        setSettings(prev => ({
          ...prev,
          ...brandResult.data,
        }));
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update profile
      await supabase
        .from('profiles')
        .update({ restaurant_name: settings.restaurant_name })
        .eq('id', user.id);

      // Upsert brand settings
      await supabase
        .from('brand_settings')
        .upsert({
          user_id: user.id,
          restaurant_name: settings.restaurant_name,
          logo_url: settings.logo_url,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          font_family: settings.font_family,
          default_style: settings.default_style,
          watermark_enabled: settings.watermark_enabled,
        });

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setSaving(false);
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-8">Brand Settings</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>Basic information about your restaurant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">Restaurant Name</Label>
                <Input
                  id="restaurantName"
                  value={settings.restaurant_name}
                  onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
                  placeholder="Enter restaurant name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={settings.logo_url}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>Choose your brand colors for menus and exports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      placeholder="#ea580c"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      placeholder="#15803d"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typography & Style</CardTitle>
              <CardDescription>Choose your preferred font and default enhancement style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <select
                  id="fontFamily"
                  value={settings.font_family}
                  onChange={(e) => setSettings({ ...settings, font_family: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                >
                  {FONT_OPTIONS.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultStyle">Default Enhancement Style</Label>
                <select
                  id="defaultStyle"
                  value={settings.default_style}
                  onChange={(e) => setSettings({ ...settings, default_style: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                >
                  {STYLE_OPTIONS.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Watermark</CardTitle>
              <CardDescription>Add your logo as a watermark to enhanced photos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="watermark">Enable Watermark</Label>
                <Switch
                  id="watermark"
                  checked={settings.watermark_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, watermark_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
