import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Video, Crown, ChevronDown, ChevronUp, Play, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoItem {
  id: string;
  storage_path: string;
  duration: number;
  uploaded_at: string;
}

interface SessionCardProps {
  id: string;
  name: string;
  code: string;
  participants: number;
  videosCount: number;
  duration: string;
  tier: "free" | "pro" | "enterprise";
  isOwner?: boolean;
}

const SessionCard = ({ id, name, code, participants, videosCount, duration, tier, isOwner }: SessionCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const tierColors = {
    free: "text-muted-foreground",
    pro: "text-secondary",
    enterprise: "text-primary"
  };

  const handleToggle = async () => {
    if (!expanded) {
      setLoading(true);
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.user) return;

        let query = supabase
          .from('videos')
          .select('id, storage_path, duration, uploaded_at')
          .eq('session_id', id)
          .order('uploaded_at', { ascending: false });

        // Only owner sees all videos
        if (!isOwner) {
          query = query.eq('user_id', authSession.user.id);
        }

        const { data } = await query;
        setVideos(data || []);
      } catch (error) {
        console.error("Failed to fetch videos:", error);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  const downloadVideo = async (video: VideoItem) => {
    if (downloadingId) return;
    setDownloadingId(video.id);
    
    try {
      toast.info("Preparing download...");
      const { data } = await supabase.storage
        .from('videos')
        .download(video.storage_path);
      
      if (data) {
        const url = URL.createObjectURL(data);
        const filename = `${name}-${video.duration}s-${Date.now()}.webm`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        toast.success("Video saved!");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card className="glass-card hover-lift overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={handleToggle}
        className="w-full p-6 text-left hover:bg-muted/30 transition-colors touch-manipulation"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">{name}</h3>
              {isOwner && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Crown className="w-3 h-3" />
                  Owner
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Code: {code}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-3 py-1 rounded-full bg-muted ${tierColors[tier]}`}>
              {tier.toUpperCase()}
            </span>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <Users className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{participants}</p>
            <p className="text-xs text-muted-foreground">Users</p>
          </div>
          <div className="space-y-1">
            <Video className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{videosCount}</p>
            <p className="text-xs text-muted-foreground">Videos</p>
          </div>
          <div className="space-y-1">
            <Clock className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{duration}</p>
            <p className="text-xs text-muted-foreground">Max</p>
          </div>
        </div>
      </button>

      {/* Expandable video list */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No videos yet
            </p>
          ) : (
            <div className="space-y-2">
              {!isOwner && (
                <p className="text-xs text-muted-foreground mb-2">
                  Showing your clips only
                </p>
              )}
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-2 bg-background rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-7 bg-muted rounded flex items-center justify-center">
                      <Play className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{video.duration}s clip</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(video.uploaded_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadVideo(video);
                    }}
                    disabled={downloadingId === video.id}
                  >
                    {downloadingId === video.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default SessionCard;
