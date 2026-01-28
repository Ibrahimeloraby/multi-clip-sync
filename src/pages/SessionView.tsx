import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "@/components/Navbar";
import VideoUpload from "@/components/VideoUpload";
import MultiAnglePlayer from "@/components/MultiAnglePlayer";
import ExportModal from "@/components/ExportModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Video, Play, Users, Download, Share2, Trash2, Crown, Copy, Check, 
  QrCode, Film, Clock, ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Session {
  id: string;
  name: string;
  time_code: string;
  mode: string;
  tier: string;
  max_video_length: number;
  owner_id: string;
}

interface Profile {
  id: string;
  username: string;
  device_id: string;
  avatar_url?: string;
}

interface Participant {
  id: string;
  user_id: string;
  device_id: string;
  joined_at: string;
  profiles: Profile;
}

interface VideoItem {
  id: string;
  user_id: string;
  device_id: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  uploaded_at: string;
  profiles: Profile;
}

type ViewMode = 'my-videos' | 'all-videos';

const SessionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const autoRecordTriggered = useRef(false);
  
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('all-videos');
  const [showMultiAnglePlayer, setShowMultiAnglePlayer] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [autoRecordMode, setAutoRecordMode] = useState(searchParams.get('autoRecord') === 'true');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  const displayedVideos = !isOwner 
    ? videos.filter(v => v.user_id === user?.id)
    : viewMode === 'my-videos' 
      ? videos.filter(v => v.user_id === user?.id)
      : videos;

  useEffect(() => {
    if (!id) return;
    
    let attempts = 0;
    const maxAttempts = 5;
    
    const checkAndFetch = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        fetchSessionData(authSession.user.id);
        subscribeToUpdates();
        return true;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkAndFetch, 500);
        return false;
      }
      return false;
    };
    
    checkAndFetch();
  }, [id]);

  const fetchSessionData = async (userId?: string) => {
    const currentUserId = userId || user?.id;
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions').select('*').eq('id', id).single();
      if (sessionError) throw sessionError;
      setSession(sessionData);
      setIsOwner(sessionData.owner_id === currentUserId);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', currentUserId).single();
      if (profileError) throw profileError;
      setUserProfile(profileData);

      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants').select('*, profiles(*)').eq('session_id', id);
      if (participantsError) throw participantsError;
      setParticipants(participantsData as any);

      const { data: videosData, error: videosError } = await supabase
        .from('videos').select('*, profiles(*)').eq('session_id', id)
        .order('uploaded_at', { ascending: true });
      if (videosError) throw videosError;
      setVideos(videosData as any);
    } catch (error: any) {
      toast.error(error.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`session-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `session_id=eq.${id}` }, () => fetchSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${id}` }, () => fetchSessionData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase.from('videos').delete().eq('id', videoId);
      if (error) throw error;
      toast.success("Video deleted");
      fetchSessionData();
    } catch (error: any) {
      toast.error("Failed to delete video");
    }
  };

  const handleExport = () => {
    if (videos.length === 0) {
      toast.error("No videos to export");
      return;
    }
    setShowExportModal(true);
  };

  const copyTimeCode = () => {
    if (!session?.time_code) return;
    navigator.clipboard.writeText(session.time_code);
    setCopied(true);
    toast.success("Time code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/q/${session?.time_code}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Join link copied!");
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session || !userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Session Not Found</h1>
          <Button onClick={() => navigate('/')} variant="secondary">Go Home</Button>
        </div>
      </div>
    );
  }

  const totalDuration = videos.reduce((sum, v) => sum + v.duration, 0);
  const maxParticipants = session.tier === 'free' ? 3 : session.tier === 'pro' ? 20 : 999;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-24 max-w-6xl">
        {/* Clean Header */}
        <header className="py-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold">{session.name}</h1>
                {isOwner && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Crown className="w-3 h-3 mr-1" />
                    Owner
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button 
                  onClick={copyTimeCode}
                  className="font-mono text-foreground/80 hover:text-foreground transition-colors"
                >
                  {session.time_code}
                </button>
                <span className="w-px h-3 bg-border" />
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {participants.length}
                </span>
                <span className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" />
                  {videos.length}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSharePanel(true)}
                className="h-9"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Invite
              </Button>
              {isOwner && videos.length > 0 && (
                <Button onClick={handleExport} size="sm" className="h-9 gradient-primary">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Multi-Angle Player Toggle */}
            {isOwner && videos.length >= 2 && (
              <button
                onClick={() => setShowMultiAnglePlayer(!showMultiAnglePlayer)}
                className="w-full p-4 rounded-xl bg-card border border-border flex items-center justify-between hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Film className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Multi-Angle Player</p>
                    <p className="text-xs text-muted-foreground">{videos.length} synced angles</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showMultiAnglePlayer ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
              </button>
            )}

            {showMultiAnglePlayer && videos.length >= 2 && (
              <div className="animate-fade-in">
                <MultiAnglePlayer videos={videos} />
              </div>
            )}

            {/* Video Upload */}
            <VideoUpload
              sessionId={session.id}
              userId={user!.id}
              deviceId={userProfile.device_id}
              maxDuration={session.max_video_length}
              onUploadComplete={fetchSessionData}
              autoStart={autoRecordMode && !isOwner}
              onAutoStartComplete={() => setAutoRecordMode(false)}
            />

            {/* Videos List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {!isOwner ? 'Your Clips' : viewMode === 'my-videos' ? 'Your Clips' : 'All Clips'}
                </h2>
                {isOwner && (
                  <div className="flex text-sm">
                    <button
                      onClick={() => setViewMode('my-videos')}
                      className={`px-3 py-1 transition-colors ${
                        viewMode === 'my-videos' 
                          ? 'text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Mine
                    </button>
                    <span className="text-border">|</span>
                    <button
                      onClick={() => setViewMode('all-videos')}
                      className={`px-3 py-1 transition-colors ${
                        viewMode === 'all-videos' 
                          ? 'text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All ({videos.length})
                    </button>
                  </div>
                )}
              </div>
              
              {displayedVideos.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No clips yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedVideos.map((video, index) => (
                    <div 
                      key={video.id} 
                      className="group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      {/* Thumbnail */}
                      <button 
                        onClick={() => setPlayingVideo(video)}
                        className="relative w-16 h-10 bg-muted rounded overflow-hidden shrink-0"
                      >
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 text-white" fill="white" />
                        </div>
                      </button>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{video.profiles?.username || 'Unknown'}</p>
                          {video.user_id === user?.id && (
                            <span className="text-[10px] text-primary">you</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {video.duration}s · {new Date(video.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(isOwner || video.user_id === user?.id) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this clip?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteVideo(video.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Participants */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Participants ({participants.length})
              </h3>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {participant.profiles.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {participant.profiles.username}
                        {participant.user_id === session.owner_id && (
                          <span className="text-muted-foreground"> · owner</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Details */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Max clip</dt>
                  <dd>{session.max_video_length}s</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Mode</dt>
                  <dd className="capitalize">{session.mode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tier</dt>
                  <dd className="capitalize">{session.tier}</dd>
                </div>
              </dl>
              
              {session.tier === 'free' && participants.length >= 3 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>

            {/* Quick Invite */}
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Invite link</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={copyShareLink}
                  className="h-7 text-xs"
                >
                  {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  Copy
                </Button>
              </div>
              <div 
                onClick={() => setShowSharePanel(true)}
                className="p-3 bg-white rounded cursor-pointer hover:opacity-90 transition-opacity"
              >
                <QRCodeSVG 
                  value={`${window.location.origin}/q/${session.time_code}`}
                  size={120}
                  level="L"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Share Panel Modal */}
      <Dialog open={showSharePanel} onOpenChange={setShowSharePanel}>
        <DialogContent className="max-w-xs p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG 
                value={`${window.location.origin}/q/${session.time_code}`}
                size={180}
                level="H"
              />
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold font-mono tracking-widest">{session.time_code}</p>
              <p className="text-sm text-muted-foreground mt-1">Scan or enter code to join</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={copyTimeCode}
              >
                {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                Code
              </Button>
              <Button 
                className="flex-1"
                onClick={copyShareLink}
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-0">
          <div className="aspect-video">
            {playingVideo && (
              <video
                src={`https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${playingVideo.storage_path}`}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            )}
          </div>
          
          {playingVideo && (
            <div className="bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{playingVideo.profiles?.username || 'Video'}</p>
                  <p className="text-xs text-muted-foreground">
                    {playingVideo.duration}s · {new Date(playingVideo.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${playingVideo.storage_path}`;
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `timecode-${playingVideo.profiles?.username || 'video'}-${playingVideo.id.slice(0, 8)}.mp4`;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success("Download started!");
                    }}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download
                  </Button>
                  
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const url = `https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${playingVideo.storage_path}`;
                        try {
                          const response = await fetch(url);
                          const blob = await response.blob();
                          const file = new File([blob], `timecode-${playingVideo.profiles?.username || 'video'}.mp4`, { type: 'video/mp4' });
                          
                          if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({
                              files: [file],
                              title: 'Check out this video!',
                              text: `Multi-angle video from ${session?.name || 'TimeCode'}`,
                            });
                          } else {
                            await navigator.share({
                              title: 'Check out this video!',
                              text: `Multi-angle video from ${session?.name || 'TimeCode'}`,
                              url: url,
                            });
                          }
                        } catch (error: any) {
                          if (error.name !== 'AbortError') {
                            toast.error("Sharing failed");
                          }
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-1.5" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      {session && (
        <ExportModal
          open={showExportModal}
          onOpenChange={setShowExportModal}
          sessionId={session.id}
          sessionName={session.name}
          tier={session.tier}
          videos={videos}
        />
      )}
    </div>
  );
};

export default SessionView;
