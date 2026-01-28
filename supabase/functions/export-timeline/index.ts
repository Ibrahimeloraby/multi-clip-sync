import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  sessionId: string;
  format: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high';
  includeWatermark: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sessionId, format = 'mp4', quality = 'medium', includeWatermark = false }: ExportRequest = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all videos for this session
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('session_id', sessionId)
      .order('uploaded_at', { ascending: true });

    if (videosError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch videos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No videos in this session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total duration
    const totalDuration = videos.reduce((sum, v) => sum + v.duration, 0);

    // Generate video URLs for client-side processing
    const videoUrls = videos.map(v => ({
      id: v.id,
      url: `${supabaseUrl}/storage/v1/object/public/videos/${v.storage_path}`,
      duration: v.duration,
      uploadedAt: v.uploaded_at,
      deviceId: v.device_id,
      userId: v.user_id
    }));

    // For now, we return the video manifest for client-side stitching
    // In production, you'd use FFmpeg or a video processing service
    const exportManifest = {
      sessionId,
      sessionName: session.name,
      format,
      quality,
      includeWatermark: session.tier === 'free' ? true : includeWatermark,
      totalDuration,
      videoCount: videos.length,
      videos: videoUrls,
      createdAt: new Date().toISOString(),
      // Export instructions for client
      instructions: "Use these video URLs to create a timeline. For production, integrate with a video processing service like FFmpeg, Mux, or Cloudflare Stream."
    };

    // Log export request
    console.log(`Export requested for session ${sessionId}: ${videos.length} videos, ${totalDuration}s total`);

    // Create synced session record
    const { data: syncedSession, error: syncError } = await supabase
      .from('synced_sessions')
      .insert({
        session_id: sessionId,
        storage_path: `exports/${sessionId}/${Date.now()}-manifest.json`,
        duration: totalDuration,
        export_format: format,
        has_watermark: session.tier === 'free'
      })
      .select()
      .single();

    if (syncError) {
      console.error('Failed to create synced session record:', syncError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        export: exportManifest,
        syncedSessionId: syncedSession?.id,
        message: `Export manifest created for ${videos.length} videos (${totalDuration}s total). Download individual clips to combine them.`,
        downloadInstructions: [
          "1. Download all video clips below",
          "2. Use a video editor (iMovie, CapCut, or DaVinci Resolve) to arrange them",
          "3. Export your final multi-angle video",
          "Pro tip: Arrange clips side-by-side for split-screen effect!"
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Export error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
