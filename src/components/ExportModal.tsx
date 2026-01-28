import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Download, 
  Film, 
  Loader2, 
  CheckCircle, 
  ExternalLink,
  Copy,
  Video
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoItem {
  id: string;
  storage_path: string;
  duration: number;
  uploaded_at: string;
  profiles?: {
    username: string;
  };
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionName: string;
  tier: string;
  videos: VideoItem[];
}

const ExportModal = ({ 
  open, 
  onOpenChange, 
  sessionId, 
  sessionName, 
  tier,
  videos 
}: ExportModalProps) => {
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const totalDuration = videos.reduce((sum, v) => sum + v.duration, 0);
  const hasWatermark = tier === 'free';

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-timeline', {
        body: {
          sessionId,
          format: 'mp4',
          quality: 'high',
          includeWatermark: hasWatermark
        }
      });

      if (error) throw error;
      setExportResult(data);
      toast.success("Export ready! Download your videos below.");
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const downloadVideo = async (video: VideoItem, index: number) => {
    const url = `https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${video.storage_path}`;
    const filename = `${sessionName}-clip-${index + 1}-${video.profiles?.username || 'unknown'}.mp4`;
    
    setDownloadProgress(prev => ({ ...prev, [video.id]: 10 }));
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      setDownloadProgress(prev => ({ ...prev, [video.id]: 80 }));
      
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      setDownloadProgress(prev => ({ ...prev, [video.id]: 100 }));
      toast.success(`Downloaded clip ${index + 1}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download clip ${index + 1}`);
      setDownloadProgress(prev => ({ ...prev, [video.id]: 0 }));
    }
  };

  const downloadAll = async () => {
    toast.info(`Downloading ${videos.length} videos...`);
    for (let i = 0; i < videos.length; i++) {
      await downloadVideo(videos[i], i);
      // Small delay between downloads
      await new Promise(r => setTimeout(r, 500));
    }
    toast.success("All videos downloaded!");
  };

  const copyInstructions = () => {
    const text = `
Multi-Angle Video Export - ${sessionName}
========================================
Total clips: ${videos.length}
Total duration: ${totalDuration}s

How to create your multi-angle video:
1. Download all clips using the button above
2. Import clips into your video editor (iMovie, CapCut, Premiere, DaVinci Resolve)
3. Arrange clips chronologically on your timeline
4. For split-screen: Stack clips on multiple tracks and resize
5. Export your final video!

Tips:
- Sort clips by upload time for chronological order
- Use picture-in-picture for multiple angles at once
- Add transitions between clips for smooth flow
    `.trim();
    
    navigator.clipboard.writeText(text);
    toast.success("Instructions copied!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Export Timeline - {sessionName}
          </DialogTitle>
          <DialogDescription>
            Download all clips to create your multi-angle video
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info */}
          <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <p className="font-medium">{videos.length} video clips</p>
                <p className="text-sm text-muted-foreground">
                  Total duration: {Math.floor(totalDuration / 60)}m {totalDuration % 60}s
                </p>
              </div>
              <Badge variant={hasWatermark ? "secondary" : "default"}>
                {tier.toUpperCase()} {hasWatermark && "• Watermark"}
              </Badge>
            </div>
          </Card>

          {/* Export Actions */}
          {!exportResult ? (
            <div className="space-y-3">
              <Button
                onClick={handleExport}
                disabled={exporting || videos.length === 0}
                className="w-full gradient-primary gap-2"
                size="lg"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Prepare Download ({videos.length} clips)
                  </>
                )}
              </Button>
              
              {hasWatermark && (
                <p className="text-xs text-center text-muted-foreground">
                  Free tier includes a small watermark. Upgrade to Pro for watermark-free exports.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Export ready!</span>
              </div>

              {/* Instructions */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  How to create your video:
                </h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  {exportResult.downloadInstructions?.map((instruction: string, i: number) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInstructions}
                  className="mt-3 gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Instructions
                </Button>
              </Card>

              {/* Download All Button */}
              <Button
                onClick={downloadAll}
                className="w-full gradient-primary gap-2"
                size="lg"
              >
                <Download className="w-4 h-4" />
                Download All {videos.length} Clips
              </Button>

              {/* Individual Video Downloads */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Or download individually:</h4>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {videos.map((video, index) => (
                    <div 
                      key={video.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Clip {index + 1} - {video.profiles?.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">{video.duration}s</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {downloadProgress[video.id] && downloadProgress[video.id] < 100 ? (
                          <Progress value={downloadProgress[video.id]} className="w-16" />
                        ) : downloadProgress[video.id] === 100 ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadVideo(video, index)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
