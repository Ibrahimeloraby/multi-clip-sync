-- MoodMatch Agent: OTT platforms connected by user
CREATE TABLE IF NOT EXISTS user_platforms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform_id TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  country_code TEXT DEFAULT 'US',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform_id)
);

-- MoodMatch Agent: cached content catalog with mood associations
CREATE TABLE IF NOT EXISTS content_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  release_date TEXT,
  vote_average NUMERIC(3,1),
  genres JSONB DEFAULT '[]',
  moods TEXT[] DEFAULT '{}',
  platform_ids TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tmdb_id, content_type)
);

-- MoodMatch Agent: user mood sessions and agent recommendations
CREATE TABLE IF NOT EXISTS mood_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood TEXT NOT NULL,
  mood_description TEXT,
  recommendations JSONB DEFAULT '[]',
  agent_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MoodMatch Agent: what users actually watched after recommendations
CREATE TABLE IF NOT EXISTS content_watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_path TEXT,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  mood_at_watch TEXT,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  mood_after TEXT,
  review TEXT
);

-- MoodMatch Agent: platform subscription management
CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform_id TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  next_renewal_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  notify_days_before INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform_id)
);

-- Enable RLS
ALTER TABLE user_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;

-- user_platforms: users manage their own
CREATE POLICY "users_manage_own_platforms" ON user_platforms
  FOR ALL USING (auth.uid() = user_id);

-- content_catalog: public read, auth write
CREATE POLICY "content_catalog_public_read" ON content_catalog
  FOR SELECT USING (true);
CREATE POLICY "content_catalog_auth_write" ON content_catalog
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "content_catalog_auth_update" ON content_catalog
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- mood_sessions: users manage their own
CREATE POLICY "users_manage_own_mood_sessions" ON mood_sessions
  FOR ALL USING (auth.uid() = user_id);

-- content_watch_history: users manage their own
CREATE POLICY "users_manage_own_watch_history" ON content_watch_history
  FOR ALL USING (auth.uid() = user_id);

-- platform_subscriptions: users manage their own
CREATE POLICY "users_manage_own_subscriptions" ON platform_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at for subscriptions
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_subscriptions_updated_at
  BEFORE UPDATE ON platform_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();
