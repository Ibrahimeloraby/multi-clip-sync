import { useState, useEffect, useRef } from "react";
import { Play, User, Clock, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TimelineVideo {
  id: string;
  user_id: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  uploaded_at: string;
  username: string;
}

interface SessionTimelineProps {
  sessionId: string;
  sessionName: string;
  onClose: () => void;
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

// Group videos by time proximity (within 30 seconds = same "moment")
const groupVideosByMoment = (videos: TimelineVideo[]) => {
  if (videos.length === 0) return [];
  
  const groups: TimelineVideo[][] = [];
  let currentGroup: TimelineVideo[] = [];
  let lastTime = 0;
  
  videos.forEach((video, index) => {
    const videoTime = new Date(video.uploaded_at).getTime();
    
    if (index === 0) {
      currentGroup.push(video);
      lastTime = videoTime;
    } else {
      // If within 30 seconds of last video, same moment
      if (videoTime - lastTime <= 30000) {
        currentGroup.push(video);
      } else {
        groups.push([...currentGroup]);
        currentGroup = [video];
      }
      lastTime = videoTime;
    }
  });
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
};

const TimelineVideoPlayer = ({ video }: { video: TimelineVideo }) => {
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
        console.error("Failed to load video:", error);
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

  if (loading) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-library-accent" />
      </div>
    );
  }

  return (
    <video
      src={videoUrl || ''}
      controls
      autoPlay
      playsInline
      className="w-full aspect-video bg-black"
    />
  );
};

const SessionTimeline = ({ sessionId, sessionName, onClose }: SessionTimelineProps) => {
  const [videos, setVideos] = useState<TimelineVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<TimelineVideo | null>(null);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTimelineVideos();
  }, [sessionId]);

  const fetchTimelineVideos = async () => {
    setLoading(true);
    try {
      // Fetch all videos for this session with user info
      const { data: videosData, error } = await supabase
        .from('videos')
        .select('id, user_id, storage_path, thumbnail_url, duration, uploaded_at')
        .eq('session_id', sessionId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set((videosData || []).map(v => v.user_id))];
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profilesMap = new Map((profiles || []).map(p => [p.id, p.username]));

      // Map videos with usernames
      const timelineVideos: TimelineVideo[] = (videosData || []).map(v => ({
        ...v,
        username: profilesMap.get(v.user_id) || 'Unknown'
      }));

      setVideos(timelineVideos);
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const moments = groupVideosByMoment(videos);
  const currentMoment = moments[currentMomentIndex] || [];

  const navigateMoment = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentMomentIndex > 0) {
      setCurrentMomentIndex(currentMomentIndex - 1);
    } else if (direction === 'next' && currentMomentIndex < moments.length - 1) {
      setCurrentMomentIndex(currentMomentIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-library-accent" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-library-text-muted">No videos in this session yet</p>
      </div>
    );
  }

  const firstVideoDate = videos.length > 0 ? formatDate(videos[0].uploaded_at) : '';

  return (
    <div className="bg-library rounded-xl border border-library-border overflow-hidden">
      {/* Timeline Header */}
      <div className="p-4 border-b border-library-border bg-library-surface">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-library-text">{sessionName} Timeline</h3>
            <p className="text-xs text-library-text-muted">{firstVideoDate} • {videos.length} clips from {new Set(videos.map(v => v.user_id)).size} contributors</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-library-text-muted hover:text-library-text"
          >
            Close
          </Button>
        </div>
        
        {/* Moment Navigation */}
        {moments.length > 1 && (
          <div className="flex items-center justify-between mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMoment('prev')}
              disabled={currentMomentIndex === 0}
              className="text-library-accent disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <span className="text-sm text-library-text-muted">
              Moment {currentMomentIndex + 1} of {moments.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMoment('next')}
              disabled={currentMomentIndex === moments.length - 1}
              className="text-library-accent disabled:opacity-30"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Current Moment - Multi-angle view */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-library-accent" />
          <span className="text-sm font-medium text-library-text">
            {formatTime(currentMoment[0]?.uploaded_at || '')}
          </span>
          <span className="text-xs text-library-text-muted">
            ({currentMoment.length} angle{currentMoment.length > 1 ? 's' : ''})
          </span>
        </div>

        {/* Videos Grid for Current Moment */}
        <div className={`grid gap-3 ${currentMoment.length === 1 ? 'grid-cols-1' : currentMoment.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {currentMoment.map((video) => (
            <button
              key={video.id}
              onClick={() => setPlayingVideo(video)}
              className="relative bg-library-surface rounded-lg overflow-hidden border border-library-border hover:border-library-accent transition-colors group"
            >
              <div className="aspect-video bg-black flex items-center justify-center">
                {video.thumbnail_url ? (
                  <img 
                    src={video.thumbnail_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Play className="w-6 h-6 text-library-text-muted" />
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-library-accent" fill="hsl(60, 100%, 50%)" />
                </div>
              </div>
              <div className="p-2 flex items-center gap-2">
                <User className="w-3 h-3 text-library-accent" />
                <span className="text-xs text-library-text truncate">{video.username}</span>
                <span className="text-xs text-library-text-muted ml-auto">{video.duration}s</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Full Timeline Scrubber */}
      <div 
        ref={timelineRef}
        className="p-4 border-t border-library-border bg-library-surface/50 overflow-x-auto"
      >
        <div className="flex gap-1 min-w-max">
          {moments.map((moment, index) => (
            <button
              key={index}
              onClick={() => setCurrentMomentIndex(index)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg border transition-all ${
                index === currentMomentIndex 
                  ? 'border-library-accent bg-library-accent/20' 
                  : 'border-library-border bg-library-surface hover:border-library-accent/50'
              }`}
            >
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-[10px] text-library-accent font-mono">
                  {formatTime(moment[0].uploaded_at).slice(0, 5)}
                </span>
                <span className="text-[8px] text-library-text-muted">
                  {moment.length} clip{moment.length > 1 ? 's' : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-library-surface border-library-border">
          {playingVideo && (
            <div>
              <TimelineVideoPlayer video={playingVideo} />
              <div className="p-3 flex items-center gap-2 border-t border-library-border">
                <User className="w-4 h-4 text-library-accent" />
                <span className="text-sm text-library-text">{playingVideo.username}</span>
                <span className="text-sm text-library-text-muted ml-auto">
                  {formatTime(playingVideo.uploaded_at)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionTimeline;
