-- Fix infinite recursion: session_participants SELECT was checking sessions.is_active
-- which caused a loop since sessions SELECT checks session_participants

-- Drop the problematic policy
DROP POLICY IF EXISTS "Participants can view session participants" ON public.session_participants;

-- Recreate without referencing sessions table - just allow authenticated users to see participants
-- of sessions they are part of (self-referencing is OK)
CREATE POLICY "Participants can view session participants"
ON public.session_participants
FOR SELECT
TO public
USING (
  session_id IN (
    SELECT sp.session_id 
    FROM session_participants sp 
    WHERE sp.user_id = auth.uid()
  )
);