-- Drop existing policies and recreate with correct conditions
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

-- Allow authenticated users to upload videos to the videos bucket
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Allow anyone to read videos (public bucket)
CREATE POLICY "Anyone can read videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

-- Allow users to update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);