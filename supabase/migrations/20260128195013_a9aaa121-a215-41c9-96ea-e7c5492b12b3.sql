-- Drop the existing participant video view policy and recreate it with 'public' role to include anonymous users
DROP POLICY IF EXISTS "Participants can view session videos" ON public.videos;

CREATE POLICY "Participants can view session videos"
ON public.videos
FOR SELECT
TO public
USING (
  session_id IN (
    SELECT session_id 
    FROM session_participants 
    WHERE user_id = auth.uid()
  )
);