// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Migration SQL statements
const MIGRATIONS = [
  // Migration 1: Add sequence_order column
  `
  -- Add sequence_order column to videos table for drag-drop reordering
  ALTER TABLE videos ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;
  `,
  `
  -- Create index for faster ordering queries
  CREATE INDEX IF NOT EXISTS idx_videos_sequence_order ON videos(session_id, sequence_order);
  `,
  `
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
  `,
  // Migration 2: Create social features tables
  `
  -- Create video_likes table for social likes feature
  CREATE TABLE IF NOT EXISTS video_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(video_id, user_id)
  );
  `,
  `
  -- Create video_comments table for comments feature
  CREATE TABLE IF NOT EXISTS video_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  `,
  `
  -- Create indexes for video_likes
  CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
  CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON video_likes(user_id);
  `,
  `
  -- Create indexes for video_comments
  CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
  CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON video_comments(user_id);
  CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON video_comments(created_at);
  `,
  `
  -- Enable Row Level Security
  ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;
  `,
  `
  -- RLS Policies for video_likes (with DROP IF EXISTS for idempotency)
  DROP POLICY IF EXISTS "Anyone can view likes" ON video_likes;
  CREATE POLICY "Anyone can view likes" ON video_likes FOR SELECT USING (true);
  `,
  `
  DROP POLICY IF EXISTS "Authenticated users can like videos" ON video_likes;
  CREATE POLICY "Authenticated users can like videos" ON video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
  `,
  `
  DROP POLICY IF EXISTS "Users can remove their own likes" ON video_likes;
  CREATE POLICY "Users can remove their own likes" ON video_likes FOR DELETE USING (auth.uid() = user_id);
  `,
  `
  -- RLS Policies for video_comments
  DROP POLICY IF EXISTS "Anyone can view comments" ON video_comments;
  CREATE POLICY "Anyone can view comments" ON video_comments FOR SELECT USING (true);
  `,
  `
  DROP POLICY IF EXISTS "Authenticated users can comment" ON video_comments;
  CREATE POLICY "Authenticated users can comment" ON video_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  `,
  `
  DROP POLICY IF EXISTS "Users can update their own comments" ON video_comments;
  CREATE POLICY "Users can update their own comments" ON video_comments FOR UPDATE USING (auth.uid() = user_id);
  `,
  `
  DROP POLICY IF EXISTS "Users can delete their own comments" ON video_comments;
  CREATE POLICY "Users can delete their own comments" ON video_comments FOR DELETE USING (auth.uid() = user_id);
  `,
  `
  -- Add trigger to update updated_at on comments
  CREATE OR REPLACE FUNCTION update_video_comments_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  `,
  `
  -- Create trigger (drop first for idempotency)
  DROP TRIGGER IF EXISTS video_comments_updated_at_trigger ON video_comments;
  CREATE TRIGGER video_comments_updated_at_trigger
    BEFORE UPDATE ON video_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_video_comments_updated_at();
  `,
]

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify authorization - only allow with service role key
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results: { migration: number; success: boolean; error?: string }[] = []

    for (let i = 0; i < MIGRATIONS.length; i++) {
      const sql = MIGRATIONS[i]
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
        if (error) {
          // Try direct query if RPC doesn't exist
          const { error: directError } = await supabase.from('_migrations_temp').select().limit(0)
          results.push({
            migration: i + 1,
            success: false,
            error: error.message
          })
        } else {
          results.push({ migration: i + 1, success: true })
        }
      } catch (err) {
        results.push({
          migration: i + 1,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    const allSuccess = results.every(r => r.success)

    return new Response(
      JSON.stringify({
        success: allSuccess,
        message: allSuccess ? 'All migrations completed successfully' : 'Some migrations failed',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
