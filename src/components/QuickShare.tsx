import { useState } from "react";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface QuickShareProps {
  timeCode: string;
  sessionName: string;
  disabled?: boolean;
}

const QuickShare = ({ timeCode, sessionName, disabled = false }: QuickShareProps) => {
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
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({
          title: sessionName,
          text: `Join my session`,
          url: smartLink,
        });
        setOpen(false);
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }
    
    // Fallback to SMS
    const smsBody = encodeURIComponent(inviteMessage);
    window.location.href = `sms:?body=${smsBody}`;
  };

  const openSMS = () => {
    const smsBody = encodeURIComponent(inviteMessage);
    window.location.href = `sms:?body=${smsBody}`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button 
          className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors disabled:opacity-50"
          disabled={disabled}
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Share</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-6 pt-4">
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium">{sessionName}</span>
        </div>

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

        <button
          onClick={copyLink}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors active:scale-[0.98]"
        >
          <span className="text-sm text-muted-foreground truncate max-w-[240px] font-mono">{smartLink}</span>
          {copied ? (
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </button>
      </SheetContent>
    </Sheet>
  );
};

export default QuickShare;