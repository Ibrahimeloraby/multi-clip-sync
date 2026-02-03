import { useState } from 'react';
import {
  Copy, Check, Share2, Link as LinkIcon,
  Twitter, Facebook, MessageCircle, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SocialShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  title: string;
  description?: string;
}

interface SharePlatform {
  name: string;
  icon: React.ReactNode;
  color: string;
  getUrl: (url: string, title: string, description: string) => string;
}

const platforms: SharePlatform[] = [
  {
    name: 'Twitter',
    icon: <Twitter className="w-5 h-5" />,
    color: 'bg-[#1DA1F2] hover:bg-[#1a8cd8]',
    getUrl: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'bg-[#4267B2] hover:bg-[#365899]',
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: 'WhatsApp',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'bg-[#25D366] hover:bg-[#20bd5a]',
    getUrl: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    name: 'Email',
    icon: <Mail className="w-5 h-5" />,
    color: 'bg-gray-600 hover:bg-gray-700',
    getUrl: (url, title, description) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${url}`)}`,
  },
];

const SocialShareModal = ({
  open,
  onOpenChange,
  shareUrl,
  title,
  description = '',
}: SocialShareModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handlePlatformShare = (platform: SharePlatform) => {
    const url = platform.getUrl(shareUrl, title, description);
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Native share button (mobile) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              className="w-full"
              onClick={handleNativeShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}

          {/* Social platforms */}
          <div className="grid grid-cols-4 gap-2">
            {platforms.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handlePlatformShare(platform)}
                className={`${platform.color} text-white p-3 rounded-lg flex flex-col items-center gap-1 transition-colors`}
              >
                {platform.icon}
                <span className="text-[10px]">{platform.name}</span>
              </button>
            ))}
          </div>

          {/* Copy link */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Or copy link</label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialShareModal;
