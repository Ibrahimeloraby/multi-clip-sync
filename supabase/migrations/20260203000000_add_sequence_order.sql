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
