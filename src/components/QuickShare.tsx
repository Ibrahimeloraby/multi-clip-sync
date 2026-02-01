import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

export interface QuickShareProps {
  timeCode: string;
  sessionName: string;
  disabled?: boolean;
  hasSession?: boolean;
  onNeedSession?: () => Promise<{ timeCode: string; sessionName: string } | null>;
}

const QuickShare = ({ 
  timeCode: initialTimeCode, 
  sessionName: initialSessionName, 
  disabled = false,
  hasSession = true,
  onNeedSession
}: QuickShareProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTimeCode, setActiveTimeCode] = useState(initialTimeCode);
  const [activeSessionName, setActiveSessionName] = useState(initialSessionName);

  const getSmartLink = (code: string) => `${window.location.origin}/q/${code}`;
  const getInviteMessage = (code: string, name: string) => `Join "${name}" 📹\n${getSmartLink(code)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteMessage(activeTimeCode, activeSessionName));
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = getInviteMessage(activeTimeCode, activeSessionName);
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

  const doNativeShare = async (code: string, name: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `Join my session "${name}"`,
          url: getSmartLink(code),
        });
        return true;
      } catch (e: any) {
        if (e.name === 'AbortError') return true;
        console.log('Native share failed:', e.message);
      }
    }
    return false;
  };

  const handleShare = async () => {
    let code = activeTimeCode;
    let name = activeSessionName;

    // If no session exists, create one first
    if (!hasSession && onNeedSession) {
      const result = await onNeedSession();
      if (result) {
        code = result.timeCode;
        name = result.sessionName;
        setActiveTimeCode(code);
        setActiveSessionName(name);
      } else {
        return;
      }
    }

    const shared = await doNativeShare(code, name);
    if (!shared) {
      setOpen(true);
    }
  };

  // Direct app links as fallback
  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getInviteMessage(activeTimeCode, activeSessionName))}`, '_blank');
  };

  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(getSmartLink(activeTimeCode))}&text=${encodeURIComponent(`Join "${activeSessionName}" 📹`)}`, '_blank');
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(getInviteMessage(activeTimeCode, activeSessionName))}`, '_blank');
  };

  const shareToSMS = () => {
    window.location.href = `sms:?body=${encodeURIComponent(getInviteMessage(activeTimeCode, activeSessionName))}`;
  };

  return (
    <>
      <button 
        onClick={handleShare}
        className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition-colors disabled:opacity-50 active:scale-95"
        disabled={disabled}
      >
        <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center shadow-lg shadow-[#FFFF00]/30">
          <Share2 className="w-6 h-6 text-[#FFFF00]" strokeWidth={2} />
        </div>
        <span className="text-[10px] font-medium">Share</span>
      </button>

      {/* Fallback sheet for when native share isn't available */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-6 pt-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
          
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            <span className="text-sm font-medium">{activeSessionName}</span>
          </div>

          {/* App share buttons */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <button
              onClick={shareToWhatsApp}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-[10px]">WhatsApp</span>
            </button>

            <button
              onClick={shareToTelegram}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#0088cc] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <span className="text-[10px]">Telegram</span>
            </button>

            <button
              onClick={shareToTwitter}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-[10px]">X</span>
            </button>

            <button
              onClick={shareToSMS}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
              </div>
              <span className="text-[10px]">Message</span>
            </button>
          </div>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors active:scale-[0.98]"
          >
            <span className="text-sm text-muted-foreground truncate max-w-[240px] font-mono">{getSmartLink(activeTimeCode)}</span>
            {copied ? (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </button>

          <p className="text-[10px] text-muted-foreground text-center mt-3">
            Tip: Install the app for full share menu access
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default QuickShare;