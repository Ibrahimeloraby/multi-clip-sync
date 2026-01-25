-- Drop and recreate the foreign key constraints to point to profiles table
ALTER TABLE public.session_participants
DROP CONSTRAINT IF EXISTS session_participants_user_id_fkey;

ALTER TABLE public.session_participants
ADD CONSTRAINT session_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop and recreate for videos
ALTER TABLE public.videos
DROP CONSTRAINT IF EXISTS videos_user_id_fkey;

ALTER TABLE public.videos
ADD CONSTRAINT videos_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix session_limits RLS - allow session owners to insert
DROP POLICY IF EXISTS "Session owners can insert limits" ON public.session_limits;
CREATE POLICY "Session owners can insert limits"
ON public.session_limits
FOR INSERT
TO authenticated
WITH CHECK (
  session_id IN (
    SELECT id FROM sessions WHERE owner_id = auth.uid()
  )
);

-- Allow session owners to update limits
DROP POLICY IF EXISTS "Session owners can update limits" ON public.session_limits;
CREATE POLICY "Session owners can update limits"
ON public.session_limits
FOR UPDATE
TO authenticated
USING (
  session_id IN (
    SELECT id FROM sessions WHERE owner_id = auth.uid()
  )
);