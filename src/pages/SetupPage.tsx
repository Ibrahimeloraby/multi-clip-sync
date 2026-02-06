import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Database, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const FULL_SETUP_SQL = `
-- =============================================
-- COMPLETE DATABASE SETUP FOR MULTI-CLIP-SYNC
-- Run this entire script in Supabase SQL Editor
-- =============================================

-- 1. Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (ignore errors if they don't exist)
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

-- 3. Create profiles policies
CREATE POLICY "Users can read all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Create sessions policies
CREATE POLICY "Anyone can read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update sessions" ON sessions FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete sessions" ON sessions FOR DELETE USING (auth.uid() = owner_id);

-- 5. Create session_participants policies
CREATE POLICY "Anyone can read participants" ON session_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join" ON session_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave" ON session_participants FOR DELETE USING (auth.uid() = user_id);

-- 6. Create videos policies
CREATE POLICY "Anyone can read videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Users can upload videos" ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own videos" ON videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own videos" ON videos FOR DELETE USING (auth.uid() = user_id);

-- 7. Create video_likes policies
CREATE POLICY "Anyone can view likes" ON video_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON video_likes FOR DELETE USING (auth.uid() = user_id);

-- 8. Create video_comments policies
CREATE POLICY "Anyone can view comments" ON video_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON video_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete comments" ON video_comments FOR DELETE USING (auth.uid() = user_id);

-- 9. Create video_likes table if not exists
CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- 10. Create video_comments table if not exists
CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Done! Your database is now configured.
SELECT 'Setup complete!' as status;
`;

interface CheckResult {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  message?: string;
}

export default function SetupPage() {
  const [checks, setChecks] = useState<CheckResult[]>([
    { name: 'Supabase connection', status: 'pending' },
    { name: 'Authentication', status: 'pending' },
    { name: 'Sessions table access', status: 'pending' },
    { name: 'Videos table access', status: 'pending' },
    { name: 'Profiles table access', status: 'pending' },
    { name: 'Social features (likes/comments)', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [allPassed, setAllPassed] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  const updateCheck = (index: number, update: Partial<CheckResult>) => {
    setChecks(prev => prev.map((c, i) => i === index ? { ...c, ...update } : c));
  };

  const runChecks = async () => {
    setIsRunning(true);
    let passed = true;

    // Check 1: Supabase connection
    updateCheck(0, { status: 'checking' });
    try {
      const { error } = await supabase.from('sessions').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        updateCheck(0, { status: 'error', message: error.message });
        passed = false;
      } else {
        updateCheck(0, { status: 'success', message: 'Connected' });
      }
    } catch (e: any) {
      updateCheck(0, { status: 'error', message: e.message });
      passed = false;
    }

    // Check 2: Authentication
    updateCheck(1, { status: 'checking' });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        updateCheck(1, { status: 'error', message: error.message });
        passed = false;
      } else if (!session) {
        // Try anonymous sign in
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          updateCheck(1, { status: 'error', message: 'Anonymous auth disabled - enable in Supabase' });
          passed = false;
        } else {
          updateCheck(1, { status: 'success', message: 'Anonymous auth works' });
        }
      } else {
        updateCheck(1, { status: 'success', message: 'Authenticated' });
      }
    } catch (e: any) {
      updateCheck(1, { status: 'error', message: e.message });
      passed = false;
    }

    // Check 3: Sessions table
    updateCheck(2, { status: 'checking' });
    try {
      const { error } = await supabase.from('sessions').select('id').limit(1);
      if (error) {
        updateCheck(2, { status: 'error', message: error.message });
        passed = false;
      } else {
        updateCheck(2, { status: 'success', message: 'Accessible' });
      }
    } catch (e: any) {
      updateCheck(2, { status: 'error', message: e.message });
      passed = false;
    }

    // Check 4: Videos table
    updateCheck(3, { status: 'checking' });
    try {
      const { error } = await supabase.from('videos').select('id').limit(1);
      if (error) {
        updateCheck(3, { status: 'error', message: error.message });
        passed = false;
      } else {
        updateCheck(3, { status: 'success', message: 'Accessible' });
      }
    } catch (e: any) {
      updateCheck(3, { status: 'error', message: e.message });
      passed = false;
    }

    // Check 5: Profiles table
    updateCheck(4, { status: 'checking' });
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        updateCheck(4, { status: 'error', message: error.message });
        passed = false;
      } else {
        updateCheck(4, { status: 'success', message: 'Accessible' });
      }
    } catch (e: any) {
      updateCheck(4, { status: 'error', message: e.message });
      passed = false;
    }

    // Check 6: Social features
    updateCheck(5, { status: 'checking' });
    try {
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from('video_likes').select('id').limit(1),
        supabase.from('video_comments').select('id').limit(1),
      ]);
      if (likesResult.error || commentsResult.error) {
        updateCheck(5, { status: 'error', message: 'Tables missing or blocked' });
        passed = false;
      } else {
        updateCheck(5, { status: 'success', message: 'Working' });
      }
    } catch (e: any) {
      updateCheck(5, { status: 'error', message: e.message });
      passed = false;
    }

    setAllPassed(passed);
    setIsRunning(false);
  };

  const copySQL = async () => {
    await navigator.clipboard.writeText(FULL_SETUP_SQL);
    toast.success('SQL copied to clipboard!');
  };

  const openSupabaseSQL = () => {
    window.open('https://supabase.com/dashboard/project/dtkfcnlxkshrflujtsaj/sql/new', '_blank');
  };

  const oneClickSetup = async () => {
    await navigator.clipboard.writeText(FULL_SETUP_SQL);
    toast.success('SQL copied! Paste in the SQL Editor and click Run.');
    openSupabaseSQL();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Setup
            </CardTitle>
            <CardDescription>
              Check your database configuration and fix any issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runChecks} disabled={isRunning} className="w-full" size="lg">
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Run Diagnostics'
              )}
            </Button>

            <div className="space-y-2">
              {checks.map((check, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{check.name}</span>
                  <div className="flex items-center gap-2">
                    {check.status === 'pending' && <span className="text-muted-foreground">-</span>}
                    {check.status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {check.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {check.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                    {check.message && (
                      <span className={`text-sm ${check.status === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {check.message}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {allPassed && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-400 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                  All checks passed! Your app is ready to use.
                </p>
              </div>
            )}

            {!allPassed && checks.some(c => c.status === 'error') && (
              <div className="pt-4 space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-700 dark:text-amber-400 font-medium mb-2">
                    Some checks failed. Run the setup SQL to fix:
                  </p>
                  <ol className="text-sm text-amber-600 dark:text-amber-500 list-decimal list-inside space-y-1">
                    <li>Click the button below to copy the SQL</li>
                    <li>It will open Supabase SQL Editor</li>
                    <li>Paste the SQL and click "Run"</li>
                    <li>Come back here and run diagnostics again</li>
                  </ol>
                </div>

                <Button onClick={oneClickSetup} variant="default" className="w-full" size="lg">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Copy SQL & Open Supabase
                </Button>

                <div className="flex gap-2">
                  <Button onClick={copySQL} variant="outline" className="flex-1">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy SQL Only
                  </Button>
                  <Button onClick={() => setShowSQL(!showSQL)} variant="outline" className="flex-1">
                    {showSQL ? 'Hide SQL' : 'View SQL'}
                  </Button>
                </div>

                {showSQL && (
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-64">
                    {FULL_SETUP_SQL}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => window.open('https://supabase.com/dashboard/project/dtkfcnlxkshrflujtsaj/auth/providers', '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Enable Anonymous Auth
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => window.open('https://supabase.com/dashboard/project/dtkfcnlxkshrflujtsaj/sql/new', '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              SQL Editor
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => window.open('https://supabase.com/dashboard/project/dtkfcnlxkshrflujtsaj/editor', '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Table Editor
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
