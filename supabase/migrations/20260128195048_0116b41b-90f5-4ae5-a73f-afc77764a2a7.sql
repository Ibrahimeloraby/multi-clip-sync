-- Add DELETE policy for videos so users can delete their own videos
CREATE POLICY "Users can delete own videos"
ON public.videos
FOR DELETE
TO public
USING (auth.uid() = user_id);