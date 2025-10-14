-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Storage policies for videos bucket
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add synced_sessions table for final exports
CREATE TABLE public.synced_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  duration INTEGER NOT NULL,
  has_watermark BOOLEAN NOT NULL DEFAULT false,
  export_format TEXT NOT NULL DEFAULT 'mp4',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.synced_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can view synced sessions"
ON public.synced_sessions FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT session_id FROM public.session_participants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Session owners can create synced sessions"
ON public.synced_sessions FOR INSERT
TO authenticated
WITH CHECK (
  session_id IN (
    SELECT id FROM public.sessions WHERE owner_id = auth.uid()
  )
);

-- Add contributor limits tracking
CREATE TABLE public.session_limits (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  max_contributors INTEGER NOT NULL DEFAULT 3,
  max_video_duration INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.session_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view session limits"
ON public.session_limits FOR SELECT
TO authenticated
USING (true);

-- Function to check contributor limit
CREATE OR REPLACE FUNCTION check_contributor_limit(p_session_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_contributors INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get max contributors for session
  SELECT max_contributors INTO v_max_contributors
  FROM session_limits
  WHERE session_id = p_session_id;
  
  -- If no limit set, check tier
  IF v_max_contributors IS NULL THEN
    SELECT CASE tier
      WHEN 'free' THEN 3
      WHEN 'pro' THEN 20
      WHEN 'enterprise' THEN 999
    END INTO v_max_contributors
    FROM sessions
    WHERE id = p_session_id;
  END IF;
  
  -- Get current participant count
  SELECT COUNT(*) INTO v_current_count
  FROM session_participants
  WHERE session_id = p_session_id;
  
  RETURN v_current_count < v_max_contributors;
END;
$$;