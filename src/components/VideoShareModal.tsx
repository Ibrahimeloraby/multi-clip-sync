import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Download, Share2, Copy, Check, Loader2,
  MessageCircle, Twitter, Facebook, Mail, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";

interface VideoShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  videoName: string;
  sessionName: string;
}

const VideoShareModal = ({ 
  open, 
  onOpenChange, 
  videoUrl, 
  videoName,
  sessionName 
}: VideoShareModalProps) => {
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharingNative, setSharingNative] = useState(false);

  const shareText = `Check out this multi-angle video from ${sessionName}!`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(videoUrl);

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(videoUrl);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy");
    } finally {
      setTimeout(() => setCopying(false), 1500);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${videoName}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Download started!");
    } catch {
      // Fallback to direct link
      window.open(videoUrl, '_blank');
      toast.success("Opening video...");
    } finally {
      setDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error("Sharing not supported on this device");
      return;
    }

    setSharingNative(true);
    try {
      // Try to share the actual video file (works on mobile)
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const file = new File([blob], `${videoName}.mp4`, { type: 'video/mp4' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: videoName,
          text: shareText,
        });
        toast.success("Shared!");
      } else {
        // Fallback to URL sharing
        await navigator.share({
          title: videoName,
          text: shareText,
          url: videoUrl,
        });
        toast.success("Shared!");
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error("Sharing failed");
      }
    } finally {
      setSharingNative(false);
    }
  };

  const socialPlatforms = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      name: "X / Twitter",
      icon: Twitter,
      color: "bg-black hover:bg-gray-800",
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-gray-600 hover:bg-gray-700",
      url: `mailto:?subject=${encodeURIComponent(videoName)}&body=${encodedText}%20${encodedUrl}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Native Share (Mobile) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button 
              className="w-full gradient-primary" 
              onClick={handleNativeShare}
              disabled={sharingNative}
            >
              {sharingNative ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              Share to Apps
            </Button>
          )}

          {/* Social Platforms */}
          <div className="grid grid-cols-2 gap-2">
            {socialPlatforms.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${platform.color}`}
              >
                <platform.icon className="w-4 h-4" />
                {platform.name}
              </a>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            {/* Copy Link */}
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleCopyLink}
            >
              {copying ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <LinkIcon className="w-4 h-4 mr-2" />
              )}
              {copying ? "Copied!" : "Copy Link"}
            </Button>

            {/* Download */}
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {downloading ? "Downloading..." : "Download Video"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tip: On mobile, use "Share to Apps" to post directly to Instagram, TikTok, and more
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoShareModal;
