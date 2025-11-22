-- Phase 1: Create storage bucket for enhanced photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'enhanced-photos',
  'enhanced-photos',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
);

-- Storage policies for enhanced-photos bucket
CREATE POLICY "Anyone can view enhanced photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'enhanced-photos');

CREATE POLICY "Authenticated users can upload enhanced photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'enhanced-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own enhanced photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'enhanced-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Phase 2: User profiles and photo library tables
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  restaurant_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Photo library table
CREATE TABLE public.photo_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_image_url text NOT NULL,
  dish_name text,
  batch_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.photo_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos"
ON public.photo_library FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos"
ON public.photo_library FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.photo_library FOR DELETE
USING (auth.uid() = user_id);

-- Enhanced photos table
CREATE TABLE public.enhanced_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_library_id uuid NOT NULL REFERENCES public.photo_library(id) ON DELETE CASCADE,
  style_name text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.enhanced_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enhanced photos of their library photos"
ON public.enhanced_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.photo_library
    WHERE photo_library.id = enhanced_photos.photo_library_id
    AND photo_library.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert enhanced photos for their library photos"
ON public.enhanced_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.photo_library
    WHERE photo_library.id = enhanced_photos.photo_library_id
    AND photo_library.user_id = auth.uid()
  )
);

-- Phase 3: Batch uploads table
CREATE TABLE public.batch_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_images integer NOT NULL,
  completed_images integer DEFAULT 0,
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.batch_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batches"
ON public.batch_uploads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batches"
ON public.batch_uploads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches"
ON public.batch_uploads FOR UPDATE
USING (auth.uid() = user_id);

-- Phase 4: Social media exports table
CREATE TABLE public.social_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enhanced_photo_id uuid NOT NULL REFERENCES public.enhanced_photos(id) ON DELETE CASCADE,
  platform text NOT NULL,
  dimensions text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view social exports of their photos"
ON public.social_exports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enhanced_photos
    JOIN public.photo_library ON photo_library.id = enhanced_photos.photo_library_id
    WHERE enhanced_photos.id = social_exports.enhanced_photo_id
    AND photo_library.user_id = auth.uid()
  )
);

-- Phase 5: Menu builder tables
CREATE TABLE public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  template text DEFAULT 'grid',
  is_published boolean DEFAULT false,
  public_url text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own menus"
ON public.menus FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menus"
ON public.menus FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menus"
ON public.menus FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menus"
ON public.menus FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view published menus"
ON public.menus FOR SELECT
USING (is_published = true);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  enhanced_photo_id uuid REFERENCES public.enhanced_photos(id) ON DELETE SET NULL,
  dish_name text NOT NULL,
  description text,
  price decimal(10,2),
  section text,
  position integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view menu items of their menus"
ON public.menu_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert menu items for their menus"
ON public.menu_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update menu items of their menus"
ON public.menu_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete menu items of their menus"
ON public.menu_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view menu items of published menus"
ON public.menu_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.is_published = true
  )
);

-- Phase 6: Brand settings table
CREATE TABLE public.brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_name text,
  logo_url text,
  primary_color text DEFAULT '#ea580c',
  secondary_color text DEFAULT '#15803d',
  font_family text DEFAULT 'Inter',
  default_style text DEFAULT 'Clean White Background',
  watermark_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand settings"
ON public.brand_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand settings"
ON public.brand_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand settings"
ON public.brand_settings FOR UPDATE
USING (auth.uid() = user_id);