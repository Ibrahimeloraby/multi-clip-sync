import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Film, Crown, Play, Download, Trash2, Loader2, ChevronRight, Clock,
  Heart, MessageCircle, Share2, Volume2, VolumeX, Camera
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Session {
  id: string;
  name: string;
  time_code: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
}

interface VideoItem {
  id: string;
  user_id: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  uploaded_at: string;
  session_id: string;
}

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

// Video player component for library
const VideoPlayer = ({ video }: { video: VideoItem }) => {
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
        <Loader2 className="w-8 h-8 animate-spin text-white" />
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

// Feed video player component
const FeedVideoPlayer = ({ 
  video, 
  isActive, 
  muted, 
  onClick 
}: { 
  video: FeedVideo; 
  isActive: boolean; 
  muted: boolean; 
  onClick: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

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
      }
    };

    fetchVideo();

    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [video.storage_path]);

  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;
    
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, videoUrl]);

  return (
    <video
      ref={videoRef}
      src={videoUrl || ''}
      loop
      muted={muted}
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
      onClick={onClick}
      poster={video.thumbnail_url || undefined}
    />
  );
};

const LibraryScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'videos';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Videos tab state
  const [videosLoading, setVideosLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [videos, setVideos] = useState<Record<string, VideoItem[]>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});
  
  // Feed tab state
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedVideos, setFeedVideos] = useState<FeedVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVideosData();
    fetchFeedData();
  }, []);

  // Videos data fetching
  const fetchVideosData = async () => {
    setVideosLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) {
        setVideosLoading(false);
        return;
      }
      
      setUserId(authSession.user.id);

      const { data: ownedSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('owner_id', authSession.user.id)
        .order('created_at', { ascending: false });

      const { data: participantData } = await supabase
        .from('session_participants')
        .select('session_id')
        .eq('user_id', authSession.user.id);

      let participatedSessions: Session[] = [];
      if (participantData && participantData.length > 0) {
        const sessionIds = participantData.map(p => p.session_id);
        const { data: partSessions } = await supabase
          .from('sessions')
          .select('*')
          .in('id', sessionIds)
          .neq('owner_id', authSession.user.id)
          .order('created_at', { ascending: false });
        participatedSessions = partSessions || [];
      }

      const allSessions = [...(ownedSessions || []), ...participatedSessions];
      setSessions(allSessions);

      if (allSessions.length > 0) {
        const sessionIds = allSessions.map(s => s.id);
        const { data: allVideos } = await supabase
          .from('videos')
          .select('id, session_id')
          .in('session_id', sessionIds);

        if (allVideos) {
          const counts: Record<string, number> = {};
          allVideos.forEach(v => {
            counts[v.session_id] = (counts[v.session_id] || 0) + 1;
          });
          setVideoCounts(counts);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setVideosLoading(false);
    }
  };

  // Feed data fetching
  const fetchFeedData = async () => {
    setFeedLoading(true);
    try {
      const { data: videosData, error } = await supabase
        .from('videos')
        .select(`id, storage_path, thumbnail_url, duration, uploaded_at, published_at, session_id, user_id`)
        .eq('published_to_feed', true)
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const sessionIds = [...new Set((videosData || []).map(v => v.session_id))];
      const userIds = [...new Set((videosData || []).map(v => v.user_id))];

      const [sessionsResult, profilesResult] = await Promise.all([
        sessionIds.length > 0 
          ? supabase.from('sessions').select('id, name').in('id', sessionIds)
          : { data: [] },
        userIds.length > 0
          ? supabase.from('profiles').select('id, username').in('id', userIds)
          : { data: [] }
      ]);

      const sessionsMap = new Map((sessionsResult.data || []).map(s => [s.id, s.name]));
      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p.username]));

      const formattedVideos: FeedVideo[] = (videosData || []).map((v: any) => ({
        id: v.id,
        storage_path: v.storage_path,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        uploaded_at: v.uploaded_at,
        session_id: v.session_id,
        session_name: sessionsMap.get(v.session_id) || 'Unknown Session',
        creator_name: profilesMap.get(v.user_id) || 'Unknown Creator',
      }));

      setFeedVideos(formattedVideos);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setFeedLoading(false);
    }
  };

  const fetchSessionVideos = async (sessionId: string, isOwner: boolean) => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.user) return;

    let query = supabase
      .from('videos')
      .select('*')
      .eq('session_id', sessionId)
      .order('uploaded_at', { ascending: false });

    if (!isOwner) {
      query = query.eq('user_id', authSession.user.id);
    }

    const { data } = await query;
    setVideos(prev => ({ ...prev, [sessionId]: data || [] }));
  };

  const toggleSession = (session: Session) => {
    if (expandedSession === session.id) {
      setExpandedSession(null);
    } else {
      setExpandedSession(session.id);
      const isOwner = session.owner_id === userId;
      fetchSessionVideos(session.id, isOwner);
    }
  };

  const handleDeleteVideo = async (videoId: string, sessionId: string) => {
    try {
      const { error } = await supabase.from('videos').delete().eq('id', videoId);
      if (error) throw error;
      
      setVideos(prev => ({
        ...prev,
        [sessionId]: prev[sessionId]?.filter(v => v.id !== videoId) || []
      }));
      setVideoCounts(prev => ({
        ...prev,
        [sessionId]: Math.max(0, (prev[sessionId] || 1) - 1)
      }));
      toast.success("Video deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const downloadVideo = async (video: VideoItem) => {
    try {
      const { data } = await supabase.storage
        .from('videos')
        .download(video.storage_path);
      
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${video.id}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Download started");
      }
    } catch (error) {
      toast.error("Download failed");
    }
  };

  // Feed scroll handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || activeTab !== 'feed') return;

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
  }, [currentIndex, feedVideos.length, activeTab]);

  const togglePlay = () => setPlaying(!playing);
  const toggleMute = () => setMuted(!muted);

  const handleFeedShare = async (video: FeedVideo) => {
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

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header with tabs */}
      <header className="bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt z-50">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">Library</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-full"
            >
              <Camera className="w-5 h-5" />
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Film className="w-4 h-4" />
                My Videos
              </TabsTrigger>
              <TabsTrigger value="feed" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Feed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="h-full overflow-auto pb-4">
            {videosLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4">
                <Film className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <h3 className="font-medium mb-1">No sessions yet</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Create or join a session to start recording
                </p>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-3">
                {sessions.map((session) => {
                  const isOwner = session.owner_id === userId;
                  const isExpanded = expandedSession === session.id;
                  const sessionVideos = videos[session.id] || [];
                  const videoCount = videoCounts[session.id] || 0;

                  return (
                    <div key={session.id} className="bg-card rounded-xl border border-border overflow-hidden">
                      <button
                        onClick={() => toggleSession(session)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors touch-manipulation"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Film className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{session.name}</span>
                              {isOwner && (
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                                  Owner
                                </Badge>
                              )}
                              {!session.is_active && (
                                <Badge variant="outline" className="text-[10px] py-0">Completed</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Film className="w-3 h-3" />
                                {isOwner ? videoCount : 'Your clips'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(session.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
                          {!isOwner && (
                            <p className="text-xs text-muted-foreground mb-2">
                              You can only see your own videos. Session owner can see all.
                            </p>
                          )}
                          {sessionVideos.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No videos yet
                            </p>
                          ) : (
                            sessionVideos.map((video) => (
                              <div key={video.id} className="flex items-center gap-3 p-2 bg-background rounded-lg">
                                <button
                                  onClick={() => setPlayingVideo(video)}
                                  className="relative w-16 h-10 bg-muted rounded overflow-hidden shrink-0"
                                >
                                  {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Film className="w-4 h-4 text-muted-foreground/50" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <Play className="w-4 h-4 text-white" fill="white" />
                                  </div>
                                </button>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{video.duration}s clip</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(video.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadVideo(video)}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete video?</AlertDialogTitle>
                                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteVideo(video.id, session.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))
                          )}

                          <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => navigate(`/session/${session.id}`)}
                          >
                            View Full Session
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="h-full bg-black">
            {feedLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            ) : feedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4">
                <Play className="w-12 h-12 mb-3 text-white/40" />
                <h3 className="font-medium mb-1 text-white">No videos yet</h3>
                <p className="text-sm text-white/60 text-center">
                  Be the first to create and share a session!
                </p>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                style={{ scrollSnapType: 'y mandatory' }}
              >
                {feedVideos.map((video, index) => (
                  <div
                    key={video.id}
                    className="h-full w-full snap-start snap-always relative flex items-center justify-center"
                  >
                    <FeedVideoPlayer 
                      video={video} 
                      isActive={index === currentIndex && playing}
                      muted={muted}
                      onClick={togglePlay}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                    {!playing && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                          <Play className="w-10 h-10 text-white ml-1" fill="white" />
                        </div>
                      </div>
                    )}

                    <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
                      <button className="flex flex-col items-center gap-1 touch-manipulation">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <Heart className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white text-xs">Like</span>
                      </button>

                      <button className="flex flex-col items-center gap-1 touch-manipulation">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white text-xs">Comment</span>
                      </button>

                      <button 
                        onClick={() => handleFeedShare(video)}
                        className="flex flex-col items-center gap-1 touch-manipulation"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <Share2 className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white text-xs">Share</span>
                      </button>

                      <button 
                        onClick={toggleMute}
                        className="flex flex-col items-center gap-1 touch-manipulation"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                        </div>
                      </button>
                    </div>

                    <div className="absolute left-4 right-20 bottom-24 safe-area-pb">
                      <p className="text-white font-semibold text-lg mb-1">@{video.creator_name}</p>
                      <p className="text-white/80 text-sm">{video.session_name}</p>
                      <p className="text-white/60 text-xs mt-1">{video.duration}s • {new Date(video.uploaded_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {playingVideo && (
            <VideoPlayer video={playingVideo} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibraryScreen;
