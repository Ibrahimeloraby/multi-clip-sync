import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  MessageCircle, Copy, Check, Loader2, Play
} from "lucide-react";
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
  const [sharing, setSharing] = useState(false);

  const smartLink = `${window.location.origin}/q/${timeCode}`;
  const inviteMessage = `Join my session "${sessionName}" 📹\n${smartLink}`;

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

  const shareViaSMS = () => {
    const smsBody = encodeURIComponent(inviteMessage);
    window.location.href = `sms:?body=${smsBody}`;
  };

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      setSharing(true);
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
      } finally {
        setSharing(false);
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
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-6">
        {/* Drag handle */}
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />
        
        {/* Session info */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">{sessionName}</h3>
          <p className="text-muted-foreground text-sm">Invite friends before going live</p>
        </div>

        {/* Big share buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={shareViaSMS}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="w-7 h-7" />
            <span className="text-xs font-medium">Message</span>
          </button>
          
          <button
            onClick={shareViaWhatsApp}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-xs font-medium">WhatsApp</span>
          </button>
          
          <button
            onClick={shareNative}
            disabled={sharing}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {sharing ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
            <span className="text-xs font-medium">More</span>
          </button>
        </div>

        {/* Copy link row */}
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors mb-6"
        >
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Session link</p>
            <p className="font-mono text-sm truncate max-w-[200px]">{smartLink}</p>
          </div>
          {copied ? (
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <Copy className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
        </button>

        {/* Go Live button */}
        <Button 
          onClick={handleGoLive}
          className="w-full h-14 text-lg gap-3 rounded-2xl bg-destructive hover:bg-destructive/90"
        >
          <Play className="w-5 h-5 fill-current" />
          Go Live
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default PreInviteSheet;
