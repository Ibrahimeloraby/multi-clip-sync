-- Create user profiles table with device tracking
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  device_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time_code TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('global', 'proximity')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  max_video_length INTEGER NOT NULL DEFAULT 30,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Anyone can view active sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Owners can insert sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Create session participants table
CREATE TABLE public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view session participants"
  ON public.session_participants FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.sessions WHERE is_active = true
    )
  );

CREATE POLICY "Users can join sessions"
  ON public.session_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration INTEGER NOT NULL,
  thumbnail_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view session videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT session_id FROM public.session_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique time code
CREATE OR REPLACE FUNCTION generate_time_code(session_uuid UUID, device_uuid TEXT)
RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  -- Get timestamp in compact format (YYYYMMDDHHMM)
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHHMM');
  
  -- Generate random 4-character code
  random_part := SUBSTRING(MD5(session_uuid::TEXT || device_uuid || NOW()::TEXT) FROM 1 FOR 4);
  
  -- Combine: TC-TIMESTAMP-RANDOM (e.g., TC-202501151430-A3F2)
  RETURN 'TC-' || timestamp_part || '-' || UPPER(random_part);
END;
$$ LANGUAGE plpgsql;