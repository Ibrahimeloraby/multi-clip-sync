-- ============================================
-- COMBINED MIGRATIONS FOR MULTI-CLIP-SYNC
-- ============================================
--
-- Run this entire file in Supabase SQL Editor:
-- 1. Go to https://supabase.com/dashboard/project/dtkfcnlxkshrflujtsaj
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file
-- 5. Click "Run"
-- ============================================

-- ============================================
-- MIGRATION 1: Add sequence_order column
-- ============================================

-- Add sequence_order column to videos table for drag-drop reordering
ALTER TABLE videos ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_videos_sequence_order ON videos(session_id, sequence_order);

-- Update existing videos to have sequential order based on upload time
WITH ordered_videos AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY uploaded_at) - 1 as new_order
  FROM videos
)
UPDATE videos v
SET sequence_order = ov.new_order
FROM ordered_videos ov
WHERE v.id = ov.id;

-- Add comment explaining the column
COMMENT ON COLUMN videos.sequence_order IS 'Order of video in multi-angle sequence (0-indexed, lower = first)';

-- ============================================
-- MIGRATION 2: Social Features (Likes & Comments)
-- ============================================

-- Create video_likes table for social likes feature
CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- Create video_comments table for comments feature
CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON video_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON video_comments(created_at);

-- Enable Row Level Security
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_likes (drop first for idempotency)
DROP POLICY IF EXISTS "Anyone can view likes" ON video_likes;
CREATE POLICY "Anyone can view likes" ON video_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can like videos" ON video_likes;
CREATE POLICY "Authenticated users can like videos" ON video_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own likes" ON video_likes;
CREATE POLICY "Users can remove their own likes" ON video_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for video_comments (drop first for idempotency)
DROP POLICY IF EXISTS "Anyone can view comments" ON video_comments;
CREATE POLICY "Anyone can view comments" ON video_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON video_comments;
CREATE POLICY "Authenticated users can comment" ON video_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON video_comments;
CREATE POLICY "Users can update their own comments" ON video_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON video_comments;
CREATE POLICY "Users can delete their own comments" ON video_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at on comments
CREATE OR REPLACE FUNCTION update_video_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first for idempotency)
DROP TRIGGER IF EXISTS video_comments_updated_at_trigger ON video_comments;
CREATE TRIGGER video_comments_updated_at_trigger
  BEFORE UPDATE ON video_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_video_comments_updated_at();

-- Add comments
COMMENT ON TABLE video_likes IS 'Stores likes on videos for social feed features';
COMMENT ON TABLE video_comments IS 'Stores comments on videos for social interactions';

-- ============================================
-- DONE! Migrations completed successfully.
-- ============================================
