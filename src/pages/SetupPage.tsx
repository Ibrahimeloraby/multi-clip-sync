import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Database } from 'lucide-react';

const MIGRATIONS_SQL = `
-- Add sequence_order column
ALTER TABLE videos ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_videos_sequence_order ON videos(session_id, sequence_order);

-- Create video_likes table
CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- Create video_comments table
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
`;

interface CheckResult {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  message?: string;
}

export default function SetupPage() {
  const [checks, setChecks] = useState<CheckResult[]>([
    { name: 'videos.sequence_order column', status: 'pending' },
    { name: 'video_likes table', status: 'pending' },
    { name: 'video_comments table', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [allPassed, setAllPassed] = useState(false);

  const updateCheck = (index: number, update: Partial<CheckResult>) => {
    setChecks(prev => prev.map((c, i) => i === index ? { ...c, ...update } : c));
  };

  const runChecks = async () => {
    setIsRunning(true);
    let passed = true;

    // Check sequence_order column
    updateCheck(0, { status: 'checking' });
    try {
      const { error } = await supabase.from('videos').select('sequence_order').limit(0);
      if (error?.message?.includes('sequence_order')) {
        updateCheck(0, { status: 'error', message: 'Column missing' });
        passed = false;
      } else {
        updateCheck(0, { status: 'success', message: 'Column exists' });
      }
    } catch {
      updateCheck(0, { status: 'error', message: 'Check failed' });
      passed = false;
    }

    // Check video_likes table
    updateCheck(1, { status: 'checking' });
    try {
      const { error } = await supabase.from('video_likes').select('id').limit(0);
      if (error?.code === '42P01') {
        updateCheck(1, { status: 'error', message: 'Table missing' });
        passed = false;
      } else {
        updateCheck(1, { status: 'success', message: 'Table exists' });
      }
    } catch {
      updateCheck(1, { status: 'error', message: 'Check failed' });
      passed = false;
    }

    // Check video_comments table
    updateCheck(2, { status: 'checking' });
    try {
      const { error } = await supabase.from('video_comments').select('id').limit(0);
      if (error?.code === '42P01') {
        updateCheck(2, { status: 'error', message: 'Table missing' });
        passed = false;
      } else {
        updateCheck(2, { status: 'success', message: 'Table exists' });
      }
    } catch {
      updateCheck(2, { status: 'error', message: 'Check failed' });
      passed = false;
    }

    setAllPassed(passed);
    setIsRunning(false);
  };

  const copyMigrations = () => {
    navigator.clipboard.writeText(MIGRATIONS_SQL);
  };

  const openSupabaseSQL = () => {
    window.open('https://supabase.com/dashboard/project/dtkfcnlxkshrflujtsaj/sql/new', '_blank');
  };

  const runMigrationsOneClick = async () => {
    // Copy to clipboard and open Supabase SQL Editor
    await navigator.clipboard.writeText(MIGRATIONS_SQL);
    openSupabaseSQL();
    alert('SQL copied to clipboard! Paste it in the SQL Editor and click Run.');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Setup
            </CardTitle>
            <CardDescription>
              Check and configure your database schema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runChecks} disabled={isRunning} className="w-full">
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Database Schema'
              )}
            </Button>

            <div className="space-y-2">
              {checks.map((check, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <span>{check.name}</span>
                  <div className="flex items-center gap-2">
                    {check.status === 'pending' && <span className="text-muted-foreground">-</span>}
                    {check.status === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {check.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {check.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                    {check.message && <span className="text-sm text-muted-foreground">{check.message}</span>}
                  </div>
                </div>
              ))}
            </div>

            {!allPassed && checks.some(c => c.status === 'error') && (
              <div className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Some database objects are missing. Run migrations to fix this:
                </p>
                <Button onClick={runMigrationsOneClick} variant="default" className="w-full">
                  One-Click Setup (Opens Supabase)
                </Button>
                <div className="flex gap-2">
                  <Button onClick={copyMigrations} variant="outline" className="flex-1">
                    Copy SQL
                  </Button>
                  <Button onClick={openSupabaseSQL} variant="outline" className="flex-1">
                    Open SQL Editor
                  </Button>
                </div>
              </div>
            )}

            {allPassed && (
              <div className="pt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Database schema is fully configured!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
