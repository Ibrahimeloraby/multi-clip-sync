#!/usr/bin/env npx tsx
/**
 * Direct Database Migration Script
 *
 * Connects directly to Supabase PostgreSQL and runs migrations.
 *
 * Required environment variable:
 *   SUPABASE_DB_PASSWORD - Your Supabase database password
 *
 * Usage:
 *   npx tsx scripts/run-migrations.ts
 */

import { Client } from 'pg';

const PROJECT_REF = 'dtkfcnlxkshrflujtsaj';

const MIGRATIONS_SQL = `
-- ============================================
-- Create video_likes table
-- ============================================
CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- ============================================
-- Create video_comments table
-- ============================================
CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON video_comments(user_id);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for video_likes
-- ============================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view likes" ON video_likes;
  CREATE POLICY "Anyone can view likes" ON video_likes FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can like" ON video_likes;
  CREATE POLICY "Users can like" ON video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can unlike" ON video_likes;
  CREATE POLICY "Users can unlike" ON video_likes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- RLS Policies for video_comments
-- ============================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view comments" ON video_comments;
  CREATE POLICY "Anyone can view comments" ON video_comments FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can comment" ON video_comments;
  CREATE POLICY "Users can comment" ON video_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete comments" ON video_comments;
  CREATE POLICY "Users can delete comments" ON video_comments FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add sequence_order column if not exists
ALTER TABLE videos ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_videos_sequence_order ON videos(session_id, sequence_order);
`;

async function runMigrations() {
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) {
    console.error('❌ Missing SUPABASE_DB_PASSWORD environment variable');
    console.error('');
    console.error('To get your database password:');
    console.error('1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/database');
    console.error('2. Find "Database password" section');
    console.error('3. Copy the password');
    console.error('');
    console.error('Then run:');
    console.error('  SUPABASE_DB_PASSWORD=yourpassword npx tsx scripts/run-migrations.ts');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres.${PROJECT_REF}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

  console.log('🔌 Connecting to Supabase database...');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log('🚀 Running migrations...');
    await client.query(MIGRATIONS_SQL);

    console.log('✅ Migrations completed successfully!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('video_likes', 'video_comments')
      ORDER BY table_name
    `);

    console.log('');
    console.log('📋 Tables created:');
    result.rows.forEach(row => console.log('   ✓ ' + row.table_name));

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('password authentication failed')) {
      console.error('');
      console.error('The database password is incorrect.');
      console.error('Get the correct password from:');
      console.error('https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/database');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
