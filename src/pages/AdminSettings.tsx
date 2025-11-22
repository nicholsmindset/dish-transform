import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Settings as SettingsIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  category: string;
  updated_at: string;
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      toast.error("Access denied. Admin privileges required.");
      navigate('/dashboard');
      return;
    }

    if (role === 'admin') {
      loadSettings();
    }
  }, [role, roleLoading, navigate]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      toast.error("Failed to load settings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev =>
      prev.map(s => s.setting_key === key ? { ...s, setting_value: value } : s)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all settings
      const updates = settings.map(setting => ({
        id: setting.id,
        setting_value: setting.setting_value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ setting_value: update.setting_value })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success("Settings saved successfully");
      loadSettings(); // Reload to get updated timestamps
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.setting_key === key);
  };

  const getSettingValue = (key: string, defaultValue: any = null) => {
    const setting = getSetting(key);
    return setting ? setting.setting_value : defaultValue;
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-secondary/10">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <SettingsIcon className="w-8 h-8 text-primary" />
                System Settings
              </h1>
              <p className="text-muted-foreground">Configure system-wide defaults and features</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="enhancement" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="enhancement">Enhancement</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          {/* Enhancement Settings */}
          <TabsContent value="enhancement">
            <Card>
              <CardHeader>
                <CardTitle>Enhancement Settings</CardTitle>
                <CardDescription>Configure default enhancement styles and options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="default_style">Default Enhancement Style</Label>
                  <Input
                    id="default_style"
                    value={getSettingValue('default_enhancement_style', '')}
                    onChange={(e) => updateSetting('default_enhancement_style', e.target.value)}
                    placeholder="Clean White Background"
                  />
                  <p className="text-sm text-muted-foreground">
                    {getSetting('default_enhancement_style')?.description}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="available_styles">Available Enhancement Styles</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Comma-separated list of available styles
                  </p>
                  <Input
                    id="available_styles"
                    value={Array.isArray(getSettingValue('available_styles')) 
                      ? getSettingValue('available_styles').join(', ') 
                      : ''}
                    onChange={(e) => {
                      const styles = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      updateSetting('available_styles', styles);
                    }}
                    placeholder="Clean White Background, Rustic Table Setting, Dark Moody Background"
                  />
                  <p className="text-sm text-muted-foreground">
                    {getSetting('available_styles')?.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Settings */}
          <TabsContent value="storage">
            <Card>
              <CardHeader>
                <CardTitle>Storage & Limits</CardTitle>
                <CardDescription>Configure storage limits and upload restrictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="max_storage">Max Storage Per User (MB)</Label>
                  <Input
                    id="max_storage"
                    type="number"
                    value={getSettingValue('max_storage_per_user_mb', 5000)}
                    onChange={(e) => updateSetting('max_storage_per_user_mb', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    {getSetting('max_storage_per_user_mb')?.description}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="max_photos">Max Photos Per User</Label>
                  <Input
                    id="max_photos"
                    type="number"
                    value={getSettingValue('max_photos_per_user', 1000)}
                    onChange={(e) => updateSetting('max_photos_per_user', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    {getSetting('max_photos_per_user')?.description} • Set to 0 for unlimited
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="max_batch">Max Batch Upload Size</Label>
                  <Input
                    id="max_batch"
                    type="number"
                    value={getSettingValue('max_batch_upload_size', 10)}
                    onChange={(e) => updateSetting('max_batch_upload_size', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    {getSetting('max_batch_upload_size')?.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature Flags */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>Enable or disable system features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="batch_upload">Batch Upload</Label>
                    <p className="text-sm text-muted-foreground">
                      {getSetting('feature_batch_upload')?.description}
                    </p>
                  </div>
                  <Switch
                    id="batch_upload"
                    checked={getSettingValue('feature_batch_upload', true)}
                    onCheckedChange={(checked) => updateSetting('feature_batch_upload', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="social_export">Social Media Export</Label>
                    <p className="text-sm text-muted-foreground">
                      {getSetting('feature_social_export')?.description}
                    </p>
                  </div>
                  <Switch
                    id="social_export"
                    checked={getSettingValue('feature_social_export', true)}
                    onCheckedChange={(checked) => updateSetting('feature_social_export', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="menu_builder">Menu Builder</Label>
                    <p className="text-sm text-muted-foreground">
                      {getSetting('feature_menu_builder')?.description}
                    </p>
                  </div>
                  <Switch
                    id="menu_builder"
                    checked={getSettingValue('feature_menu_builder', true)}
                    onCheckedChange={(checked) => updateSetting('feature_menu_builder', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="brand_settings">Brand Consistency Settings</Label>
                    <p className="text-sm text-muted-foreground">
                      {getSetting('feature_brand_settings')?.description}
                    </p>
                  </div>
                  <Switch
                    id="brand_settings"
                    checked={getSettingValue('feature_brand_settings', true)}
                    onCheckedChange={(checked) => updateSetting('feature_brand_settings', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>System-wide configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="signup_enabled">User Registrations</Label>
                    <p className="text-sm text-muted-foreground">
                      {getSetting('signup_enabled')?.description}
                    </p>
                  </div>
                  <Switch
                    id="signup_enabled"
                    checked={getSettingValue('signup_enabled', true)}
                    onCheckedChange={(checked) => updateSetting('signup_enabled', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="watermark_default">Default Watermark</Label>
                    <p className="text-sm text-muted-foreground">
                      {getSetting('watermark_default_enabled')?.description}
                    </p>
                  </div>
                  <Switch
                    id="watermark_default"
                    checked={getSettingValue('watermark_default_enabled', false)}
                    onCheckedChange={(checked) => updateSetting('watermark_default_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Last Updated Info */}
        {settings.length > 0 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(settings[0].updated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
