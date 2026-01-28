-- Create security definer function to check session participation without recursion
CREATE OR REPLACE FUNCTION public.get_user_session_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT session_id FROM session_participants WHERE user_id = p_user_id
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Participants can view session participants" ON public.session_participants;

-- Recreate using the security definer function
CREATE POLICY "Participants can view session participants"
ON public.session_participants
FOR SELECT
TO public
USING (session_id IN (SELECT public.get_user_session_ids(auth.uid())));

-- Also fix sessions policies that may reference session_participants
DROP POLICY IF EXISTS "Participants can view their sessions" ON public.sessions;

CREATE POLICY "Participants can view their sessions"
ON public.sessions
FOR SELECT
TO public
USING (id IN (SELECT public.get_user_session_ids(auth.uid())));