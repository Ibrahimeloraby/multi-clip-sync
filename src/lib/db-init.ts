import { supabase } from '@/integrations/supabase/client';

interface MigrationStatus {
  tablesExist: boolean;
  missingTables: string[];
  columnsExist: boolean;
  missingColumns: string[];
}

/**
 * Checks if the database schema is properly initialized
 * This runs on app startup to verify all required tables and columns exist
 */
export async function checkDatabaseSchema(): Promise<MigrationStatus> {
  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  try {
    // Check if video_likes table exists
    const { error: likesError } = await supabase
      .from('video_likes')
      .select('id')
      .limit(0);

    if (likesError?.code === '42P01') {
      missingTables.push('video_likes');
    }

    // Check if video_comments table exists
    const { error: commentsError } = await supabase
      .from('video_comments')
      .select('id')
      .limit(0);

    if (commentsError?.code === '42P01') {
      missingTables.push('video_comments');
    }

    // Check if videos table has sequence_order column
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('sequence_order')
      .limit(0);

    if (videoError?.message?.includes('sequence_order')) {
      missingColumns.push('videos.sequence_order');
    }

  } catch (error) {
    console.error('Error checking database schema:', error);
  }

  return {
    tablesExist: missingTables.length === 0,
    missingTables,
    columnsExist: missingColumns.length === 0,
    missingColumns,
  };
}

/**
 * Logs migration status and provides guidance if migrations are needed
 */
export async function initializeDatabase(): Promise<boolean> {
  const status = await checkDatabaseSchema();

  if (!status.tablesExist || !status.columnsExist) {
    console.warn('⚠️ Database migrations required!');

    if (status.missingTables.length > 0) {
      console.warn('Missing tables:', status.missingTables.join(', '));
    }

    if (status.missingColumns.length > 0) {
      console.warn('Missing columns:', status.missingColumns.join(', '));
    }

    console.warn('');
    console.warn('To run migrations:');
    console.warn('1. Go to Supabase Dashboard → SQL Editor');
    console.warn('2. Run the contents of: supabase/migrations/COMBINED_MIGRATIONS.sql');
    console.warn('');
    console.warn('Or set up GitHub Secrets and push to trigger automatic migrations.');

    return false;
  }

  console.log('✅ Database schema is up to date');
  return true;
}

/**
 * Hook for React components to check database status
 */
export function useDatabaseStatus() {
  return {
    checkSchema: checkDatabaseSchema,
    initialize: initializeDatabase,
  };
}
