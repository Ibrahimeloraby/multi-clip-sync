-- Shopping products extracted from screenshots
CREATE TABLE IF NOT EXISTS shopping_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session_id TEXT NOT NULL, -- anonymous session-based user ID
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category TEXT,
  description TEXT,
  specs JSONB DEFAULT '{}',
  screenshot_url TEXT,
  original_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  search_query TEXT, -- optimized query for searching
  alternative_queries JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached scraped listings per search
CREATE TABLE IF NOT EXISTS scraped_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES shopping_products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  retailer TEXT NOT NULL,
  retailer_display_name TEXT,
  product_url TEXT,
  image_url TEXT,
  rating DECIMAL(3,2),
  review_count INTEGER,
  in_stock BOOLEAN DEFAULT true,
  condition TEXT DEFAULT 'new', -- 'new', 'refurbished', 'used'
  return_policy TEXT,
  shipping_info TEXT,
  seller_name TEXT,
  seller_rating DECIMAL(3,2),
  is_official_retailer BOOLEAN DEFAULT false,
  deal_score TEXT DEFAULT 'C', -- 'A', 'B', 'C', 'D'
  region TEXT DEFAULT 'US',
  savings_amount DECIMAL(10,2),
  savings_percent DECIMAL(5,2),
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history for tracking over time
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES shopping_products(id) ON DELETE CASCADE,
  retailer TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  in_stock BOOLEAN DEFAULT true,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price alerts set by users
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session_id TEXT NOT NULL,
  product_id UUID REFERENCES shopping_products(id) ON DELETE CASCADE,
  target_price DECIMAL(10,2),
  percentage_drop_threshold DECIMAL(5,2),
  watch_duration_days INTEGER DEFAULT 30,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  notify_on_back_in_stock BOOLEAN DEFAULT false,
  notify_on_coupon BOOLEAN DEFAULT false,
  alert_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0
);

-- Watchlist: products user wants to track
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session_id TEXT NOT NULL,
  product_id UUID REFERENCES shopping_products(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_session_id, product_id)
);

-- Found coupon codes
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES shopping_products(id) ON DELETE CASCADE,
  retailer TEXT NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT DEFAULT 'percentage', -- 'percentage', 'fixed'
  discount_value DECIMAL(10,2),
  expires_at TIMESTAMPTZ,
  verified BOOLEAN DEFAULT false,
  found_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES shopping_products(id) ON DELETE CASCADE,
  buy_now BOOLEAN,
  deal_rating TEXT, -- 'excellent', 'good', 'fair', 'poor'
  reasoning TEXT,
  best_time_to_buy TEXT,
  price_trend TEXT, -- 'rising', 'falling', 'stable'
  savings_tip TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_products_session ON shopping_products(user_session_id);
CREATE INDEX IF NOT EXISTS idx_scraped_listings_product ON scraped_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_session ON price_alerts(user_session_id, active);
CREATE INDEX IF NOT EXISTS idx_watchlist_session ON watchlist(user_session_id);

-- RLS policies (permissive for session-based anonymous auth)
ALTER TABLE shopping_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Allow all operations (session-based auth, no user accounts needed)
CREATE POLICY "Allow all shopping_products" ON shopping_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all scraped_listings" ON scraped_listings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all price_history" ON price_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all price_alerts" ON price_alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all watchlist" ON watchlist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all coupons" ON coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all ai_recommendations" ON ai_recommendations FOR ALL USING (true) WITH CHECK (true);
