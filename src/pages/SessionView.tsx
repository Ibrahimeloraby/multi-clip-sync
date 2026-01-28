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
  QrCode, Film, Instagram, Twitter, ExternalLink, Clock, Layers, 
  ChevronRight, X
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
      
      <div className="container mx-auto px-4 pt-20 pb-24">
        {/* Compact Header */}
        <header className="py-6 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
                {isOwner && (
                  <Badge className="bg-primary/20 text-primary border-0 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Owner
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">{session.time_code}</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {participants.length}
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {videos.length} clips
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {totalDuration}s
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowSharePanel(true)}
                className="rounded-full"
              >
                <QrCode className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={copyShareLink}
                className="rounded-full"
              >
                <Share2 className="w-5 h-5" />
              </Button>
              {isOwner && videos.length > 0 && (
                <Button onClick={handleExport} size="sm" className="gradient-primary rounded-full px-4">
                  <Download className="w-4 h-4 mr-1.5" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Multi-Angle Player Toggle */}
            {isOwner && videos.length >= 2 && (
              <button
                onClick={() => setShowMultiAnglePlayer(!showMultiAnglePlayer)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 flex items-center justify-between hover:from-primary/20 hover:to-secondary/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <Film className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Multi-Angle Player</p>
                    <p className="text-xs text-muted-foreground">View all {videos.length} angles synced</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showMultiAnglePlayer ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
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
                <h2 className="text-lg font-semibold">
                  {!isOwner ? 'Your Videos' : viewMode === 'my-videos' ? 'Your Videos' : 'All Videos'}
                </h2>
                {isOwner && (
                  <div className="flex bg-muted/50 rounded-full p-1">
                    <button
                      onClick={() => setViewMode('my-videos')}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                        viewMode === 'my-videos' 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Mine
                    </button>
                    <button
                      onClick={() => setViewMode('all-videos')}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                        viewMode === 'all-videos' 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All ({videos.length})
                    </button>
                  </div>
                )}
              </div>
              
              {displayedVideos.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                  <Video className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm">No videos yet</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Start recording to add your angle</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {displayedVideos.map((video, index) => (
                    <div 
                      key={video.id} 
                      className="group p-3 rounded-xl bg-card/50 border border-border/50 hover:bg-card hover:border-border transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <button 
                          onClick={() => setPlayingVideo(video)}
                          className="relative w-20 h-14 bg-muted rounded-lg overflow-hidden shrink-0 group/thumb"
                        >
                          {video.thumbnail_url ? (
                            <img 
                              src={video.thumbnail_url} 
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <Play className="w-6 h-6 text-white" fill="white" />
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">
                            {video.duration}s
                          </div>
                        </button>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{video.profiles?.username || 'Unknown'}</p>
                            {video.user_id === user?.id && (
                              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">You</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Angle #{index + 1} · {new Date(video.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => setPlayingVideo(video)}
                            className="h-8 w-8 rounded-full"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          {(isOwner || video.user_id === user?.id) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete video?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteVideo(video.id)} className="rounded-full bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Participants */}
            <div className="p-4 rounded-2xl bg-card/50 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm">Participants</h3>
                <span className="text-xs text-muted-foreground">{participants.length}/{maxParticipants}</span>
              </div>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                      {participant.profiles.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{participant.profiles.username}</p>
                      {participant.user_id === session.owner_id && (
                        <p className="text-[10px] text-muted-foreground">Session owner</p>
                      )}
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Share */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                  <QRCodeSVG 
                    value={`${window.location.origin}/q/${session.time_code}`}
                    size={32}
                    level="L"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Invite Others</p>
                  <p className="text-xs text-muted-foreground">Scan or share code</p>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => setShowSharePanel(true)}
                  className="rounded-full"
                >
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={session.time_code}
                  readOnly
                  className="font-mono text-sm font-semibold text-center bg-background/50 border-0 rounded-full h-9"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={copyTimeCode}
                  className="shrink-0 rounded-full h-9 w-9"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Session Stats */}
            <div className="p-4 rounded-2xl bg-card/50 border border-border/50">
              <h3 className="font-medium text-sm mb-3">Session Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">Max Length</p>
                  <p className="font-semibold">{session.max_video_length}s</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total Duration</p>
                  <p className="font-semibold">{totalDuration}s</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">Mode</p>
                  <p className="font-semibold capitalize">{session.mode}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">Tier</p>
                  <p className="font-semibold capitalize">{session.tier}</p>
                </div>
              </div>
              
              {session.tier === 'free' && participants.length >= 3 && (
                <Button
                  size="sm"
                  className="w-full mt-4 gradient-primary rounded-full"
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Share Panel Modal */}
      <Dialog open={showSharePanel} onOpenChange={setShowSharePanel}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Invite to Session</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="p-4 bg-white rounded-2xl">
              <QRCodeSVG 
                value={`${window.location.origin}/q/${session.time_code}`}
                size={200}
                level="H"
              />
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold font-mono tracking-wider">{session.time_code}</p>
              <p className="text-sm text-muted-foreground mt-1">Scan QR or enter code to join</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button 
                variant="secondary" 
                className="flex-1 rounded-full"
                onClick={copyTimeCode}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy Code
              </Button>
              <Button 
                className="flex-1 rounded-full gradient-primary"
                onClick={copyShareLink}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl bg-black">
          <div className="relative">
            <button 
              onClick={() => setPlayingVideo(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
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
          </div>
          
          {playingVideo && (
            <div className="bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{playingVideo.profiles?.username || 'Video'}</p>
                  <p className="text-sm text-muted-foreground">{playingVideo.duration}s · {new Date(playingVideo.uploaded_at).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
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
                    className="rounded-full gradient-primary"
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
                          toast.success("Shared!");
                        } else {
                          await navigator.share({
                            title: 'Check out this video!',
                            text: `Multi-angle video from ${session?.name || 'TimeCode'}`,
                            url: url,
                          });
                          toast.success("Shared!");
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
                
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    const url = `https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${playingVideo.storage_path}`;
                    window.open(`https://twitter.com/intent/tweet?text=Check out this multi-angle video!&url=${encodeURIComponent(url)}`, '_blank');
                  }}
                >
                  <Twitter className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    const url = `https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${playingVideo.storage_path}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied!");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
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
