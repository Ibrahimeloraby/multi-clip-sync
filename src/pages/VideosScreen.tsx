import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Film, Crown, Play, Download, Trash2, Loader2, ChevronRight, Users, Clock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
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

// Video player component that fetches actual video from storage
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

const VideosScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [videos, setVideos] = useState<Record<string, VideoItem[]>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) {
        setLoading(false);
        return;
      }
      
      setUserId(authSession.user.id);

      // Fetch owned sessions
      const { data: ownedSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('owner_id', authSession.user.id)
        .order('created_at', { ascending: false });

      // Fetch participated sessions
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

      // Fetch video counts for each session
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
      setLoading(false);
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

    // If not owner, only show user's own videos
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">Your Videos</h1>
          <p className="text-sm text-muted-foreground">Session recordings & clips</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="font-medium mb-1">No sessions yet</h3>
            <p className="text-sm text-muted-foreground">
              Create or join a session to start recording
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const isOwner = session.owner_id === userId;
            const isExpanded = expandedSession === session.id;
            const sessionVideos = videos[session.id] || [];
            const videoCount = videoCounts[session.id] || 0;

            return (
              <div key={session.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Session header */}
                <button
                  onClick={() => toggleSession(session)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
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

                {/* Expanded videos list */}
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
                          {/* Thumbnail */}
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

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{video.duration}s clip</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(video.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          {/* Actions */}
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

                    {/* View full session button */}
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
          })
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

      <BottomNav />
    </div>
  );
};

export default VideosScreen;
