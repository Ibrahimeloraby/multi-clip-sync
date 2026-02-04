// Supabase Edge Function to run migrations
// Deploy with: npx supabase functions deploy run-migrations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All migrations in order
const MIGRATIONS = `
-- Migration: Add sequence_order column
ALTER TABLE videos ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_videos_sequence_order ON videos(session_id, sequence_order);

-- Migration: Create video_likes table
CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- Migration: Create video_comments table
CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON video_comments(user_id);

-- RLS
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- Policies for video_likes
DROP POLICY IF EXISTS "Anyone can view likes" ON video_likes;
CREATE POLICY "Anyone can view likes" ON video_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can like videos" ON video_likes;
CREATE POLICY "Authenticated users can like videos" ON video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove their own likes" ON video_likes;
CREATE POLICY "Users can remove their own likes" ON video_likes FOR DELETE USING (auth.uid() = user_id);

-- Policies for video_comments
DROP POLICY IF EXISTS "Anyone can view comments" ON video_comments;
CREATE POLICY "Anyone can view comments" ON video_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can comment" ON video_comments;
CREATE POLICY "Authenticated users can comment" ON video_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own comments" ON video_comments;
CREATE POLICY "Users can update their own comments" ON video_comments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own comments" ON video_comments;
CREATE POLICY "Users can delete their own comments" ON video_comments FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_video_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_comments_updated_at_trigger ON video_comments;
CREATE TRIGGER video_comments_updated_at_trigger
  BEFORE UPDATE ON video_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_video_comments_updated_at();
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Execute migrations using postgres function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: MIGRATIONS
    })

    if (error) {
      // If exec_sql doesn't exist, return instructions
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Migrations need to be run manually in Supabase SQL Editor',
          sql: MIGRATIONS
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Migrations completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
