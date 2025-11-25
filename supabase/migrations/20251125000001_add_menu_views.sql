-- Create menu_views table for tracking page views and QR scans
CREATE TABLE IF NOT EXISTS menu_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT now(),
    source VARCHAR(50) DEFAULT 'direct', -- 'direct', 'qr', 'share', 'embed'
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(2),
    city VARCHAR(100)
);

-- Create index for efficient queries
CREATE INDEX idx_menu_views_menu_id ON menu_views(menu_id);
CREATE INDEX idx_menu_views_viewed_at ON menu_views(viewed_at);
CREATE INDEX idx_menu_views_menu_date ON menu_views(menu_id, viewed_at);

-- Enable RLS
ALTER TABLE menu_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views (public menus are viewable by anyone)
CREATE POLICY "Anyone can record menu views"
    ON menu_views
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy: Menu owners can view their menu analytics
CREATE POLICY "Menu owners can view their analytics"
    ON menu_views
    FOR SELECT
    TO authenticated
    USING (
        menu_id IN (
            SELECT id FROM menus WHERE user_id = auth.uid()
        )
    );

-- Create a view for daily aggregated stats
CREATE OR REPLACE VIEW menu_views_daily AS
SELECT
    menu_id,
    DATE(viewed_at) as view_date,
    COUNT(*) as view_count,
    COUNT(CASE WHEN source = 'qr' THEN 1 END) as qr_scans,
    COUNT(CASE WHEN source = 'share' THEN 1 END) as shares,
    COUNT(CASE WHEN source = 'direct' THEN 1 END) as direct_views
FROM menu_views
GROUP BY menu_id, DATE(viewed_at);

-- Grant access to the view
GRANT SELECT ON menu_views_daily TO authenticated;
