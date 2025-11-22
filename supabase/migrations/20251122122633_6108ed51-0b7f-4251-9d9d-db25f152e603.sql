-- Create system_settings table for admin-configurable system defaults
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  category text NOT NULL, -- 'enhancement', 'storage', 'features', 'general'
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage system settings
CREATE POLICY "Anyone can view system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert system settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete system settings"
ON public.system_settings
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description, category) VALUES
('default_enhancement_style', '"Clean White Background"', 'Default enhancement style for new users', 'enhancement'),
('available_styles', '["Clean White Background", "Rustic Table Setting", "Dark Moody Background"]', 'Available enhancement styles', 'enhancement'),
('max_storage_per_user_mb', '5000', 'Maximum storage per user in MB (5GB default)', 'storage'),
('max_photos_per_user', '1000', 'Maximum number of photos per user (0 = unlimited)', 'storage'),
('max_batch_upload_size', '10', 'Maximum number of photos in a batch upload', 'storage'),
('feature_batch_upload', 'true', 'Enable batch upload feature', 'features'),
('feature_social_export', 'true', 'Enable social media export feature', 'features'),
('feature_menu_builder', 'true', 'Enable menu builder feature', 'features'),
('feature_brand_settings', 'true', 'Enable brand consistency settings', 'features'),
('watermark_default_enabled', 'false', 'Enable watermark by default for new users', 'general'),
('signup_enabled', 'true', 'Allow new user registrations', 'general');

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_timestamp
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_timestamp();