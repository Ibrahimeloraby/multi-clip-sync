import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FeedVideoSkeleton } from './LoadingSkeleton';
import SocialShareModal from './SocialShareModal';
import CommentsModal from './CommentsModal';

interface FeedVideo {
  id: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  uploaded_at: string;
  session_id: string;
  session_name: string;
  creator_name: string;
  creator_id: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface EnhancedFeedTabProps {
  currentUserId?: string;
}

const EnhancedFeedTab = ({ currentUserId }: EnhancedFeedTabProps) => {
  const [feedVideos, setFeedVideos] = useState<FeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [sharingVideo, setSharingVideo] = useState<FeedVideo | null>(null);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    fetchFeedData();
  }, [currentUserId]);

  const fetchFeedData = async () => {
    setLoading(true);
    try {
      const { data: videosData, error } = await supabase
        .from('videos')
        .select('id, storage_path, thumbnail_url, duration, uploaded_at, session_id, user_id')
        .eq('published_to_feed', true)
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const sessionIds = [...new Set((videosData || []).map(v => v.session_id))];
      const userIds = [...new Set((videosData || []).map(v => v.user_id))];

      const [sessionsResult, profilesResult, likesResult] = await Promise.all([
        sessionIds.length > 0
          ? supabase.from('sessions').select('id, name').in('id', sessionIds)
          : { data: [] },
        userIds.length > 0
          ? supabase.from('profiles').select('id, username').in('id', userIds)
          : { data: [] },
        currentUserId && videosData
          ? supabase
              .from('video_likes')
              .select('video_id')
              .eq('user_id', currentUserId)
              .in('video_id', videosData.map(v => v.id))
          : { data: [] },
      ]);

      const sessionsMap = new Map((sessionsResult.data || []).map(s => [s.id, s.name]));
      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p.username]));
      const likedVideoIds = new Set((likesResult.data || []).map(l => l.video_id));

      // Fetch counts
      const videoIds = (videosData || []).map(v => v.id);
      const [likesCountResult, commentsCountResult] = await Promise.all([
        videoIds.length > 0
          ? supabase
              .from('video_likes')
              .select('video_id')
              .in('video_id', videoIds)
          : { data: [] },
        videoIds.length > 0
          ? supabase
              .from('video_comments')
              .select('video_id')
              .in('video_id', videoIds)
          : { data: [] },
      ]);

      const likesCountMap = new Map<string, number>();
      (likesCountResult.data || []).forEach(l => {
        likesCountMap.set(l.video_id, (likesCountMap.get(l.video_id) || 0) + 1);
      });

      const commentsCountMap = new Map<string, number>();
      (commentsCountResult.data || []).forEach(c => {
        commentsCountMap.set(c.video_id, (commentsCountMap.get(c.video_id) || 0) + 1);
      });

      const formattedVideos: FeedVideo[] = (videosData || []).map((v: any) => ({
        id: v.id,
        storage_path: v.storage_path,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        uploaded_at: v.uploaded_at,
        session_id: v.session_id,
        session_name: sessionsMap.get(v.session_id) || 'Unknown Session',
        creator_name: profilesMap.get(v.user_id) || 'Unknown',
        creator_id: v.user_id,
        likes_count: likesCountMap.get(v.id) || 0,
        comments_count: commentsCountMap.get(v.id) || 0,
        is_liked: likedVideoIds.has(v.id),
      }));

      setFeedVideos(formattedVideos);
    } catch (error) {
      console.error('Error fetching feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const videoHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / videoHeight);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < feedVideos.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, feedVideos.length]);

  // Play/pause videos based on visibility
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      const videoIndex = feedVideos.findIndex(v => v.id === id);
      if (videoIndex === currentIndex && playing) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [currentIndex, playing, feedVideos]);

  const handleLike = async (video: FeedVideo) => {
    if (!currentUserId) {
      toast.error('Please sign in to like videos');
      return;
    }

    const wasLiked = video.is_liked;

    // Optimistic update
    setFeedVideos(prev =>
      prev.map(v =>
        v.id === video.id
          ? {
              ...v,
              is_liked: !wasLiked,
              likes_count: wasLiked ? v.likes_count - 1 : v.likes_count + 1,
            }
          : v
      )
    );

    try {
      if (wasLiked) {
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', video.id)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('video_likes')
          .insert({ video_id: video.id, user_id: currentUserId });
      }
    } catch (error) {
      // Revert on error
      setFeedVideos(prev =>
        prev.map(v =>
          v.id === video.id
            ? {
                ...v,
                is_liked: wasLiked,
                likes_count: wasLiked ? v.likes_count + 1 : v.likes_count - 1,
              }
            : v
        )
      );
      toast.error('Failed to update like');
    }
  };

  const togglePlay = () => setPlaying(!playing);
  const toggleMute = () => setMuted(!muted);

  if (loading) {
    return (
      <div className="h-full bg-black">
        <FeedVideoSkeleton />
      </div>
    );
  }

  if (feedVideos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 bg-black">
        <div className="w-16 h-16 rounded-full bg-library-surface border-2 border-library-accent flex items-center justify-center mb-4">
          <Play className="w-8 h-8 text-library-accent" />
        </div>
        <h3 className="font-semibold text-library-text mb-1">No videos yet</h3>
        <p className="text-sm text-library-text-muted text-center">
          Be the first to create and share a session!
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {feedVideos.map((video, index) => (
          <FeedVideoItem
            key={video.id}
            video={video}
            isActive={index === currentIndex && playing}
            muted={muted}
            videoRefs={videoRefs}
            onTogglePlay={togglePlay}
            onToggleMute={toggleMute}
            onLike={() => handleLike(video)}
            onComment={() => setCommentsVideoId(video.id)}
            onShare={() => setSharingVideo(video)}
          />
        ))}
      </div>

      {/* Share Modal */}
      {sharingVideo && (
        <SocialShareModal
          open={!!sharingVideo}
          onOpenChange={(open) => !open && setSharingVideo(null)}
          shareUrl={`${window.location.origin}/session/${sharingVideo.session_id}`}
          title={`Check out this video from ${sharingVideo.session_name}!`}
          description={`A ${sharingVideo.duration}s clip by @${sharingVideo.creator_name}`}
        />
      )}

      {/* Comments Modal */}
      <CommentsModal
        open={!!commentsVideoId}
        onOpenChange={(open) => !open && setCommentsVideoId(null)}
        videoId={commentsVideoId || ''}
        currentUserId={currentUserId}
      />
    </>
  );
};

interface FeedVideoItemProps {
  video: FeedVideo;
  isActive: boolean;
  muted: boolean;
  videoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}

const FeedVideoItem = ({
  video,
  isActive,
  muted,
  videoRefs,
  onTogglePlay,
  onToggleMute,
  onLike,
  onComment,
  onShare,
}: FeedVideoItemProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data } = await supabase.storage
          .from('videos')
          .download(video.storage_path);

        if (data) {
          const url = URL.createObjectURL(data);
          setVideoUrl(url);
        }
      } catch (error) {
        console.error('Failed to load video:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();

    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [video.storage_path]);

  return (
    <div className="h-full w-full snap-start snap-always relative flex items-center justify-center">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (
        <video
          ref={(el) => {
            if (el) videoRefs.current.set(video.id, el);
          }}
          src={videoUrl || ''}
          loop
          muted={muted}
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onClick={onTogglePlay}
          poster={video.thumbnail_url || undefined}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
        <button
          onClick={onLike}
          className="flex flex-col items-center gap-1 touch-manipulation"
        >
          <div
            className={`w-12 h-12 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${
              video.is_liked
                ? 'bg-red-500/80 border-red-400'
                : 'bg-library-surface/80 border-library-accent/50'
            }`}
          >
            <Heart
              className={`w-6 h-6 ${video.is_liked ? 'text-white fill-white' : 'text-library-accent'}`}
            />
          </div>
          <span className="text-library-accent text-xs font-medium">
            {video.likes_count > 0 ? video.likes_count : 'Like'}
          </span>
        </button>

        <button
          onClick={onComment}
          className="flex flex-col items-center gap-1 touch-manipulation"
        >
          <div className="w-12 h-12 rounded-full bg-library-surface/80 backdrop-blur-sm border border-library-accent/50 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-library-accent" />
          </div>
          <span className="text-library-accent text-xs font-medium">
            {video.comments_count > 0 ? video.comments_count : 'Comment'}
          </span>
        </button>

        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 touch-manipulation"
        >
          <div className="w-12 h-12 rounded-full bg-library-surface/80 backdrop-blur-sm border border-library-accent/50 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-library-accent" />
          </div>
          <span className="text-library-accent text-xs font-medium">Share</span>
        </button>

        <button
          onClick={onToggleMute}
          className="flex flex-col items-center gap-1 touch-manipulation"
        >
          <div className="w-10 h-10 rounded-full bg-library-surface/80 backdrop-blur-sm border border-library-accent/50 flex items-center justify-center">
            {muted ? (
              <VolumeX className="w-5 h-5 text-library-accent" />
            ) : (
              <Volume2 className="w-5 h-5 text-library-accent" />
            )}
          </div>
        </button>
      </div>

      {/* Video info */}
      <div className="absolute left-4 right-20 bottom-24 safe-area-pb">
        <p className="text-library-accent font-bold text-lg mb-1">@{video.creator_name}</p>
        <p className="text-library-text text-sm">{video.session_name}</p>
        <p className="text-library-text-muted text-xs mt-1">
          {video.duration}s • {new Date(video.uploaded_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default EnhancedFeedTab;
