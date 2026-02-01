import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Copy, Check, Share2, Play } from "lucide-react";
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
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
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

        {/* Share to apps - opens native share with all messaging apps */}
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