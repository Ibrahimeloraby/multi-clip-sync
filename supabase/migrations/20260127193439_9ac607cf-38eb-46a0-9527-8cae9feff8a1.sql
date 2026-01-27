-- Update RLS policies to allow anonymous users to participate

-- Allow anonymous users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow anonymous users to join sessions
DROP POLICY IF EXISTS "Users can join sessions" ON public.session_participants;
CREATE POLICY "Users can join sessions" 
ON public.session_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to upload videos
DROP POLICY IF EXISTS "Users can upload videos" ON public.videos;
CREATE POLICY "Users can upload videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Session owners can view all videos in their sessions (for multi-angle player)
CREATE POLICY "Session owners can view all session videos" 
ON public.videos 
FOR SELECT 
USING (
  session_id IN (
    SELECT id FROM sessions WHERE owner_id = auth.uid()
  )
);