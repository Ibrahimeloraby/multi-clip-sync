#!/usr/bin/env npx tsx
/**
 * Direct Database Migration Script
 *
 * Connects directly to Supabase PostgreSQL and runs all migrations including RLS policies.
 *
 * Required environment variable:
 *   SUPABASE_DB_PASSWORD - Your Supabase database password
 */

import { Client } from 'pg';

const PROJECT_REF = 'dtkfcnlxkshrflujtsaj';

const MIGRATIONS_SQL = `
-- =============================================
-- COMPLETE DATABASE SETUP FOR MULTI-CLIP-SYNC
-- =============================================

-- 1. Create video_likes table if not exists
CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- 2. Create video_comments table if not exists
CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add sequence_order column if not exists
ALTER TABLE videos ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user_id ON video_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_sequence_order ON videos(session_id, sequence_order);

-- 5. Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies (safe to run multiple times)
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can read sessions" ON sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Owners can update sessions" ON sessions;
DROP POLICY IF EXISTS "Owners can delete sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can read participants" ON session_participants;
DROP POLICY IF EXISTS "Authenticated users can join" ON session_participants;
DROP POLICY IF EXISTS "Users can leave" ON session_participants;
DROP POLICY IF EXISTS "Anyone can read videos" ON videos;
DROP POLICY IF EXISTS "Users can upload videos" ON videos;
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
DROP POLICY IF EXISTS "Anyone can view likes" ON video_likes;
DROP POLICY IF EXISTS "Users can like" ON video_likes;
DROP POLICY IF EXISTS "Users can unlike" ON video_likes;
DROP POLICY IF EXISTS "Anyone can view comments" ON video_comments;
DROP POLICY IF EXISTS "Users can comment" ON video_comments;
DROP POLICY IF EXISTS "Users can delete comments" ON video_comments;

-- 7. Create profiles policies
CREATE POLICY "Users can read all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 8. Create sessions policies
CREATE POLICY "Anyone can read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update sessions" ON sessions FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete sessions" ON sessions FOR DELETE USING (auth.uid() = owner_id);

-- 9. Create session_participants policies
CREATE POLICY "Anyone can read participants" ON session_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join" ON session_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave" ON session_participants FOR DELETE USING (auth.uid() = user_id);

-- 10. Create videos policies
CREATE POLICY "Anyone can read videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Users can upload videos" ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own videos" ON videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own videos" ON videos FOR DELETE USING (auth.uid() = user_id);

-- 11. Create video_likes policies
CREATE POLICY "Anyone can view likes" ON video_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON video_likes FOR DELETE USING (auth.uid() = user_id);

-- 12. Create video_comments policies
CREATE POLICY "Anyone can view comments" ON video_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON video_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete comments" ON video_comments FOR DELETE USING (auth.uid() = user_id);
`;

async function runMigrations() {
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) {
    console.log('⚠️  No database password provided - skipping migrations');
    console.log('   Set SUPABASE_DB_PASSWORD secret in GitHub to enable auto-migrations');
    process.exit(0); // Exit gracefully
  }

  // Try different connection strings
  const connectionStrings = [
    `postgresql://postgres.${PROJECT_REF}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${password}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ];

  for (const connectionString of connectionStrings) {
    console.log('🔌 Trying to connect to Supabase database...');

    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
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
        AND table_name IN ('video_likes', 'video_comments', 'sessions', 'videos', 'profiles')
        ORDER BY table_name
      `);

      console.log('');
      console.log('📋 Tables verified:');
      result.rows.forEach(row => console.log('   ✓ ' + row.table_name));

      await client.end();
      process.exit(0);
    } catch (error: any) {
      await client.end().catch(() => {});

      if (error.message.includes('password authentication failed')) {
        console.error('❌ Invalid database password');
        process.exit(1);
      }

      // Try next connection string
      console.log('   Connection failed, trying alternate...');
      continue;
    }
  }

  console.error('❌ Could not connect to database with any connection string');
  console.error('   Check your SUPABASE_DB_PASSWORD secret');
  process.exit(1);
}

runMigrations();
