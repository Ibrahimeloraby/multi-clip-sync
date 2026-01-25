-- Update default max video duration to 5 minutes (300 seconds)
ALTER TABLE public.sessions ALTER COLUMN max_video_length SET DEFAULT 300;
ALTER TABLE public.session_limits ALTER COLUMN max_video_duration SET DEFAULT 300;

-- Update existing sessions to have 5 minute limit
UPDATE public.sessions SET max_video_length = 300 WHERE max_video_length = 30;
UPDATE public.session_limits SET max_video_duration = 300 WHERE max_video_duration = 30;