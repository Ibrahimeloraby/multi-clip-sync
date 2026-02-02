import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Video, Crown, ChevronDown, ChevronUp, Play, Download, Loader2, Scissors, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VideoTrimmer from "./VideoTrimmer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VideoItem {
  id: string;
  storage_path: string;
  duration: number;
  uploaded_at: string;
  user_id: string;
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
  maxDuration?: number;
}

const SessionCard = ({ id, name, code, participants, videosCount, duration, tier, isOwner, maxDuration = 300 }: SessionCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [editingBlob, setEditingBlob] = useState<Blob | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [deleteVideo, setDeleteVideo] = useState<VideoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
        
        setCurrentUserId(authSession.user.id);

        let query = supabase
          .from('videos')
          .select('id, storage_path, duration, uploaded_at, user_id')
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

  const handleEditVideo = async (video: VideoItem) => {
    if (loadingEdit) return;
    setLoadingEdit(video.id);
    
    try {
      toast.info("Loading video for editing...");
      const { data } = await supabase.storage
        .from('videos')
        .download(video.storage_path);
      
      if (data) {
        setEditingBlob(data);
        setEditingVideo(video);
      }
    } catch (error) {
      console.error("Failed to load video:", error);
      toast.error("Failed to load video for editing");
    } finally {
      setLoadingEdit(null);
    }
  };

  const handleTrimComplete = async (trimmedBlob: Blob) => {
    if (!editingVideo) return;
    
    try {
      toast.info("Saving trimmed video...");
      
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) throw new Error("Not authenticated");

      // Upload new trimmed video
      const newPath = editingVideo.storage_path.replace('.webm', `-trimmed-${Date.now()}.webm`);
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(newPath, trimmedBlob);

      if (uploadError) throw uploadError;

      // Get new duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      const newDuration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => {
          if (video.duration === Infinity || isNaN(video.duration)) {
            video.currentTime = Number.MAX_SAFE_INTEGER;
            video.ontimeupdate = () => {
              video.ontimeupdate = null;
              resolve(Math.max(1, Math.floor(video.duration)));
            };
          } else {
            resolve(Math.max(1, Math.floor(video.duration)));
          }
        };
        video.onerror = () => resolve(editingVideo.duration);
        video.src = URL.createObjectURL(trimmedBlob);
      });

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(newPath);

      // Update video record
      const { error: dbError } = await supabase
        .from('videos')
        .update({
          storage_path: newPath,
          thumbnail_url: publicUrl,
          duration: newDuration,
        })
        .eq('id', editingVideo.id);

      if (dbError) throw dbError;

      // Delete old file
      await supabase.storage.from('videos').remove([editingVideo.storage_path]);

      // Update local state
      setVideos(videos.map(v => 
        v.id === editingVideo.id 
          ? { ...v, storage_path: newPath, duration: newDuration }
          : v
      ));

      toast.success("Video trimmed successfully!");
      setEditingVideo(null);
      setEditingBlob(null);
    } catch (error: any) {
      console.error("Trim save error:", error);
      toast.error(error.message || "Failed to save trimmed video");
    }
  };

  const handleDeleteVideo = async () => {
    if (!deleteVideo) return;
    setDeleting(true);
    
    try {
      // Delete from storage
      await supabase.storage.from('videos').remove([deleteVideo.storage_path]);
      
      // Delete from database
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', deleteVideo.id);

      if (error) throw error;

      // Update local state
      setVideos(videos.filter(v => v.id !== deleteVideo.id));
      toast.success("Video deleted");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete video");
    } finally {
      setDeleting(false);
      setDeleteVideo(null);
    }
  };

  // Check if user can edit a video (owners can edit all, users can only edit their own)
  const canEdit = (video: VideoItem) => isOwner || video.user_id === currentUserId;
  
  // Check if user can delete a video (users can delete their own)
  const canDelete = (video: VideoItem) => video.user_id === currentUserId;

  return (
    <>
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
                    <div className="flex items-center gap-1">
                      {/* Edit/Trim button - only for owners or own videos */}
                      {canEdit(video) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVideo(video);
                          }}
                          disabled={loadingEdit === video.id}
                        >
                          {loadingEdit === video.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Scissors className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      
                      {/* Download button */}
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
                      
                      {/* Delete button - only for own videos */}
                      {canDelete(video) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteVideo(video);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Video Trimmer Modal */}
      {editingVideo && editingBlob && (
        <div className="fixed inset-0 z-50 bg-background/95 p-4 overflow-auto">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Video</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingVideo(null);
                  setEditingBlob(null);
                }}
              >
                Cancel
              </Button>
            </div>
            <VideoTrimmer
              videoBlob={editingBlob}
              maxDuration={maxDuration}
              onTrimComplete={handleTrimComplete}
              onCancel={() => {
                setEditingVideo(null);
                setEditingBlob(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteVideo} onOpenChange={() => setDeleteVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteVideo?.duration}s clip. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SessionCard;
