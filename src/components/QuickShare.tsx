import { useState } from "react";
import { Copy, Check, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface QuickShareProps {
  timeCode: string;
  sessionName: string;
}

const QuickShare = ({ timeCode, sessionName }: QuickShareProps) => {
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
      toast.error("Couldn't copy");
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: sessionName,
          text: `Join my session`,
          url: smartLink,
        });
        setOpen(false);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Share</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-6 pt-4">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        
        {/* Session info - compact */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium">{sessionName}</span>
        </div>

        {/* Primary action - opens native share sheet with all apps */}
        <button
          onClick={shareNative}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] mb-3"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-medium">Share to Apps</span>
        </button>

        {/* Copy link - secondary */}
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