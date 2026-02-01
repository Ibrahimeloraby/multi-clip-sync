import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Copy, Check, Share2, Play, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface PreInviteSheetProps {
  sessionName: string;
  timeCode: string;
  onGoLive: () => void;
  children?: React.ReactNode;
}

const PreInviteSheet = ({ 
  sessionName, 
  timeCode, 
  onGoLive,
  children 
}: PreInviteSheetProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const smartLink = `${window.location.origin}/q/${timeCode}`;
  const inviteMessage = `Join "${sessionName}" 📹\n${smartLink}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteMessage;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareNative = async () => {
    // Check if Web Share API is available and we're in a secure context
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({
          title: sessionName,
          text: `Join my session`,
          url: smartLink,
        });
        return;
      } catch (e: any) {
        console.log('Share failed:', e);
        if (e.name === 'AbortError') return;
        // Fall through to SMS fallback
      }
    }
    
    // Fallback: Open SMS with pre-filled message
    const smsBody = encodeURIComponent(inviteMessage);
    window.location.href = `sms:?body=${smsBody}`;
  };

  const openSMS = () => {
    const smsBody = encodeURIComponent(inviteMessage);
    window.location.href = `sms:?body=${smsBody}`;
  };

  const handleGoLive = () => {
    onGoLive();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-6 pt-4">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        
        {/* Session info - compact */}
        <div className="text-center mb-5">
          <h3 className="font-semibold">{sessionName}</h3>
          <p className="text-muted-foreground text-xs">Invite friends before going live</p>
        </div>

        {/* Two share options side by side */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={shareNative}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98]"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-medium text-sm">Share</span>
          </button>
          
          <button
            onClick={openSMS}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium text-sm">Message</span>
          </button>
        </div>

        {/* Copy link - secondary */}
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors active:scale-[0.98] mb-4"
        >
          <span className="text-sm text-muted-foreground truncate max-w-[240px] font-mono">{smartLink}</span>
          {copied ? (
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </button>

        {/* Go Live button */}
        <Button 
          onClick={handleGoLive}
          className="w-full h-12 gap-2 rounded-xl bg-destructive hover:bg-destructive/90"
        >
          <Play className="w-4 h-4 fill-current" />
          Go Live
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default PreInviteSheet;