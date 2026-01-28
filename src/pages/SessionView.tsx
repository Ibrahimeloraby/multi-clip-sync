import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "@/components/Navbar";
import VideoUpload from "@/components/VideoUpload";
import MultiAnglePlayer from "@/components/MultiAnglePlayer";
import ExportModal from "@/components/ExportModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Video, Play, Users, Download, Share2, Trash2, Crown, Copy, Check, QrCode, Film, Instagram, Twitter, ExternalLink, Loader2 } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<ViewMode>('all-videos'); // Default to all videos
  const [showMultiAnglePlayer, setShowMultiAnglePlayer] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [autoRecordMode, setAutoRecordMode] = useState(searchParams.get('autoRecord') === 'true');
  const [showExportModal, setShowExportModal] = useState(false);

  // Filter videos based on view mode - participants ONLY see their own, owners can toggle
  const displayedVideos = !isOwner 
    ? videos.filter(v => v.user_id === user?.id)  // Participants always see only their own
    : viewMode === 'my-videos' 
      ? videos.filter(v => v.user_id === user?.id)
      : videos;

  // No redirect to auth - guests are handled via anonymous sign-in
  // The JoinSession page handles anonymous auth before navigating here

  useEffect(() => {
    // Only fetch data when we have session ID
    if (!id) return;
    
    let attempts = 0;
    const maxAttempts = 5;
    
    const checkAndFetch = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        console.log("Auth session found, fetching data for user:", authSession.user.id);
        fetchSessionData(authSession.user.id);
        subscribeToUpdates();
        return true;
      }
      
      attempts++;
      console.log(`Auth session not found, attempt ${attempts}/${maxAttempts}`);
      
      if (attempts < maxAttempts) {
        // Retry after a short delay
        setTimeout(checkAndFetch, 500);
        return false;
      }
      
      console.error("Failed to get auth session after max attempts");
      return false;
    };
    
    checkAndFetch();
  }, [id]);

  const fetchSessionData = async (userId?: string) => {
    const currentUserId = userId || user?.id;
    
    if (!currentUserId) {
      console.error("No user ID available");
      return;
    }
    
    try {
      setLoading(true);

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);
      setIsOwner(sessionData.owner_id === currentUserId);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profileData);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select('*, profiles(*)')
        .eq('session_id', id);

      if (participantsError) throw participantsError;
      setParticipants(participantsData as any);

      // Fetch videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*, profiles(*)')
        .eq('session_id', id)
        .order('uploaded_at', { ascending: true });

      if (videosError) throw videosError;
      setVideos(videosData as any);

    } catch (error: any) {
      console.error("Error fetching session:", error);
      toast.error(error.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`session-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'videos',
        filter: `session_id=eq.${id}`
      }, () => {
        fetchSessionData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${id}`
      }, () => {
        fetchSessionData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      toast.success("Video deleted");
      fetchSessionData();
    } catch (error: any) {
      console.error("Delete error:", error);
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

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/q/${session?.time_code}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Quick join link copied!");
  };

  const copyTimeCode = () => {
    if (!session?.time_code) return;
    navigator.clipboard.writeText(session.time_code);
    setCopied(true);
    toast.success("Time code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session || !userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const tierColors = {
    free: "bg-muted",
    pro: "bg-secondary",
    enterprise: "bg-primary"
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{session.name}</h1>
                {isOwner && (
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Owner
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground font-mono text-sm">Code: {session.time_code}</p>
              <div className="flex gap-2 mt-2">
                <Badge className={tierColors[session.tier as keyof typeof tierColors]}>
                  {session.tier.toUpperCase()}
                </Badge>
                <Badge variant="outline">{session.mode} mode</Badge>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleShare} variant="secondary" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              {isOwner && videos.length >= 2 && (
                <Button 
                  onClick={() => setShowMultiAnglePlayer(!showMultiAnglePlayer)} 
                  variant={showMultiAnglePlayer ? "default" : "secondary"}
                  size="sm"
                >
                  <Film className="w-4 h-4 mr-2" />
                  {showMultiAnglePlayer ? 'Hide Player' : 'Multi-Angle Player'}
                </Button>
              )}
              {isOwner && videos.length > 0 && (
                <Button onClick={handleExport} className="gradient-primary" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Timeline
                </Button>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Multi-Angle Player for Owner */}
              {isOwner && showMultiAnglePlayer && videos.length >= 2 && (
                <MultiAnglePlayer videos={videos} />
              )}

              {/* Video Upload - prominent for participants */}
              <VideoUpload
                sessionId={session.id}
                userId={user!.id}
                deviceId={userProfile.device_id}
                maxDuration={session.max_video_length}
                onUploadComplete={fetchSessionData}
                autoStart={autoRecordMode && !isOwner}
                onAutoStartComplete={() => setAutoRecordMode(false)}
              />

              {/* Multi-Angle Timeline */}
              <Card className="glass-card p-6 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h2 className="text-xl font-semibold">
                    {viewMode === 'my-videos' ? 'My Videos' : 'All Videos'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <div className="flex bg-muted rounded-lg p-1">
                        <Button
                          size="sm"
                          variant={viewMode === 'my-videos' ? 'secondary' : 'ghost'}
                          onClick={() => setViewMode('my-videos')}
                          className="text-xs"
                        >
                          My Videos
                        </Button>
                        <Button
                          size="sm"
                          variant={viewMode === 'all-videos' ? 'secondary' : 'ghost'}
                          onClick={() => setViewMode('all-videos')}
                          className="text-xs"
                        >
                          All ({videos.length})
                        </Button>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {displayedVideos.length} video{displayedVideos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                {displayedVideos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{viewMode === 'my-videos' ? 'You haven\'t recorded any videos yet. Start recording!' : 'No videos yet. Be the first to upload!'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedVideos.map((video, index) => (
                      <div key={video.id} className="glass-card p-4 rounded-lg hover-lift">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0 relative">
                            {video.thumbnail_url ? (
                              <img 
                                src={video.thumbnail_url} 
                                alt="Thumbnail"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Video className="w-6 h-6 text-muted-foreground" />
                            )}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Synced" />
                          </div>
                          
                          {/* Video Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{video.profiles?.username || 'Unknown'}</p>
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              {video.user_id === user?.id && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                            <div className="flex gap-3 text-sm text-muted-foreground">
                              <span>{video.duration}s</span>
                              <span>•</span>
                              <span>{new Date(video.uploaded_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          
                          {/* Action Buttons - Always visible */}
                          <div className="flex gap-2 shrink-0">
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => setPlayingVideo(video)}
                              className="gap-1"
                            >
                              <Play className="w-4 h-4" />
                              <span className="hidden sm:inline">Play</span>
                            </Button>
                            {(isOwner || video.user_id === user?.id) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="glass-card">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Video?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteVideo(video.id)}>
                                      Delete
                                    </AlertDialogAction>
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
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Participants */}
              <Card className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participants
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {participants.length}/{session.tier === 'free' ? 3 : session.tier === 'pro' ? 20 : '∞'}
                  </span>
                </div>
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-foreground">
                            {participant.profiles.username[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{participant.profiles.username}</p>
                          {participant.user_id === session.owner_id && (
                            <p className="text-xs text-muted-foreground">Owner</p>
                          )}
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Share Time Code */}
              <Card className="glass-card p-6 space-y-4 border-2 border-primary/20">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  Share Session
                </h2>
                <p className="text-sm text-muted-foreground">
                  Scan this QR code or share the link to join and record from any phone
                </p>
                
                {/* QR Code */}
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={`${window.location.origin}/q/${session.time_code}`}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={session.time_code}
                      readOnly
                      className="font-mono text-lg font-bold text-center bg-muted"
                    />
                    <Button 
                      variant="secondary" 
                      size="icon"
                      onClick={copyTimeCode}
                      className="shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button onClick={handleShare} className="w-full gradient-primary" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Copy Join Link
                  </Button>
                </div>
              </Card>

              {/* Session Info */}
              <Card className="glass-card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Session Info</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Length:</span>
                    <span className="font-medium">{session.max_video_length}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Videos:</span>
                    <span className="font-medium">{videos.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Duration:</span>
                    <span className="font-medium">
                      {videos.reduce((sum, v) => sum + v.duration, 0)}s
                    </span>
                  </div>
                </div>
                
                {session.tier === 'free' && participants.length >= 3 && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      Reached contributor limit!
                    </p>
                    <Button
                      size="sm"
                      className="w-full gradient-primary"
                      onClick={() => navigate('/pricing')}
                    >
                      Upgrade to Pro
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Dialog with Download & Share */}
      <AlertDialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
        <AlertDialogContent className="glass-card max-w-3xl p-0 overflow-hidden">
          <AlertDialogHeader className="p-4 pb-0">
            <AlertDialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              {playingVideo?.profiles?.username || 'Video'} - {playingVideo?.duration}s
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="w-full aspect-video bg-black">
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
          <div className="p-4 pt-2 space-y-3">
            {/* Download & Share buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!playingVideo) return;
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
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${playingVideo?.storage_path}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Video link copied!");
                }}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
            </div>
            
            {/* Social sharing */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">Share to social:</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${playingVideo?.storage_path}`;
                    window.open(`https://twitter.com/intent/tweet?text=Check out this multi-angle video!&url=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="gap-2"
                >
                  <Twitter className="w-4 h-4" />
                  X/Twitter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info("To share on Instagram: Download the video first, then upload it in the Instagram app");
                  }}
                  className="gap-2"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info("To share on TikTok: Download the video first, then upload it in the TikTok app");
                  }}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  TikTok
                </Button>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="p-4 pt-0">
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
