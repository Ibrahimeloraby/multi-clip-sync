-- Update session SELECT policy to allow owners to always view their sessions (even when inactive/completed)
DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.sessions;

CREATE POLICY "View active sessions or own sessions"
ON public.sessions
FOR SELECT
TO public
USING (
  is_active = true 
  OR owner_id = auth.uid()
);

-- Also allow participants to view sessions they participated in (even if completed)
CREATE POLICY "Participants can view their sessions"
ON public.sessions
FOR SELECT
TO public
USING (
  id IN (
    SELECT session_id 
    FROM session_participants 
    WHERE user_id = auth.uid()
  )
);