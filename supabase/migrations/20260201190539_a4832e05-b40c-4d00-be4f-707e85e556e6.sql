-- Add live streaming and feed publishing support

-- Add is_live column to sessions for live mode indicator
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

-- Add published_to_feed column to videos for feed visibility
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS published_to_feed boolean NOT NULL DEFAULT false;

-- Add published_at timestamp for feed ordering
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- Create index for feed queries (only published videos)
CREATE INDEX IF NOT EXISTS idx_videos_published_feed 
ON public.videos (published_to_feed, published_at DESC) 
WHERE published_to_feed = true;

-- RLS policy: Anyone can view published videos in the feed
CREATE POLICY "Anyone can view published feed videos" 
ON public.videos 
FOR SELECT 
USING (published_to_feed = true);

-- RLS policy: Session owners can update videos (to publish them)
CREATE POLICY "Session owners can update session videos" 
ON public.videos 
FOR UPDATE 
USING (
  session_id IN (
    SELECT id FROM sessions WHERE owner_id = auth.uid()
  )
);

-- Create table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.webrtc_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  signal_type text NOT NULL, -- 'offer', 'answer', 'ice-candidate'
  signal_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on webrtc_signals
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Participants can insert signals
CREATE POLICY "Participants can insert signals" 
ON public.webrtc_signals 
FOR INSERT 
WITH CHECK (
  auth.uid() = from_user_id AND
  session_id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
);

-- Participants can read signals addressed to them
CREATE POLICY "Participants can read their signals" 
ON public.webrtc_signals 
FOR SELECT 
USING (
  to_user_id = auth.uid() AND
  session_id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
);

-- Participants can delete their own signals (cleanup)
CREATE POLICY "Users can delete their signals" 
ON public.webrtc_signals 
FOR DELETE 
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Enable realtime for webrtc_signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;