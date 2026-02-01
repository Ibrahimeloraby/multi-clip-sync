import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

interface FeedVideo {
  id: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  uploaded_at: string;
  session_id: string;
  session_name: string;
  creator_name: string;
}

const FeedScreen = () => {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeedVideos();
  }, []);

  const fetchFeedVideos = async () => {
    setLoading(true);
    try {
      // Fetch public videos (all videos from completed sessions or recent uploads)
      // For now, fetch recent videos with session info
      const { data: videosData, error } = await supabase
        .from('videos')
        .select(`
          id,
          storage_path,
          thumbnail_url,
          duration,
          uploaded_at,
          session_id,
          sessions!inner (
            name,
            owner_id,
            profiles:owner_id (
              username
            )
          )
        `)
        .order('uploaded_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedVideos: FeedVideo[] = (videosData || []).map((v: any) => ({
        id: v.id,
        storage_path: v.storage_path,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        uploaded_at: v.uploaded_at,
        session_id: v.session_id,
        session_name: v.sessions?.name || 'Unknown Session',
        creator_name: v.sessions?.profiles?.username || 'Unknown Creator',
      }));

      setVideos(formattedVideos);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle scroll snapping to detect current video
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const videoHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / videoHeight);
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, videos.length]);

  // Play/pause based on current index
  useEffect(() => {
    videos.forEach((video, index) => {
      const videoEl = videoRefs.current.get(video.id);
      if (!videoEl) return;

      if (index === currentIndex && playing) {
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    });
  }, [currentIndex, playing, videos]);

  const togglePlay = () => setPlaying(!playing);
  const toggleMute = () => setMuted(!muted);

  const handleShare = async (video: FeedVideo) => {
    const shareUrl = `${window.location.origin}/session/${video.session_id}`;
    const shareText = `Check out this video from ${video.session_name}!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: video.session_name, text: shareText, url: shareUrl });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center px-4">
          <Play className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-medium mb-1">No videos yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to create and share a session!
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Scrollable video feed */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="h-screen w-full snap-start snap-always relative flex items-center justify-center"
          >
            {/* Video */}
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(video.id, el);
              }}
              src={video.thumbnail_url || ''}
              loop
              muted={muted}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              onClick={togglePlay}
            />

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

            {/* Play/Pause indicator */}
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </div>
              </div>
            )}

            {/* Right side actions */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
              <button className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Like</span>
              </button>

              <button className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Comment</span>
              </button>

              <button 
                onClick={() => handleShare(video)}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Share</span>
              </button>

              <button 
                onClick={toggleMute}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                </div>
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute left-4 right-20 bottom-24 safe-area-pb">
              <p className="text-white font-semibold text-lg mb-1">@{video.creator_name}</p>
              <p className="text-white/80 text-sm">{video.session_name}</p>
              <p className="text-white/60 text-xs mt-1">{video.duration}s • {new Date(video.uploaded_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 safe-area-pt">
        <div className="flex justify-center py-4">
          <h1 className="text-white font-bold text-lg">Feed</h1>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default FeedScreen;
