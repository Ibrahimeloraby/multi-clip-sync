import { useState } from "react";
import { Share2, Copy, Check, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuickShareProps {
  timeCode: string;
  sessionName: string;
  variant?: "button" | "icon";
  className?: string;
}

const QuickShare = ({ timeCode, sessionName, variant = "icon", className = "" }: QuickShareProps) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Smart link that works universally
  const smartLink = `${window.location.origin}/q/${timeCode}`;
  const shareText = `Join my TimeCode session "${sessionName}"`;
  const fullMessage = `${shareText}\n\n${smartLink}`;

  const handleQuickShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      setSharing(true);
      try {
        await navigator.share({
          title: `Join ${sessionName}`,
          text: shareText,
          url: smartLink,
        });
        toast.success("Shared!");
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // Fallback to copy
          await copyToClipboard();
        }
      } finally {
        setSharing(false);
      }
    } else {
      // Desktop fallback - copy link
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      toast.success("Link copied! Paste in any app");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fullMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Quick SMS/iMessage share (iOS/Android)
  const handleSMSShare = () => {
    const smsBody = encodeURIComponent(fullMessage);
    // Works on both iOS and Android
    window.location.href = `sms:?body=${smsBody}`;
  };

  // Quick WhatsApp share
  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
    window.open(waUrl, '_blank');
  };

  if (variant === "button") {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          onClick={handleQuickShare}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 px-4 rounded-full font-medium hover:bg-primary/90 transition-colors"
          disabled={sharing}
        >
          {sharing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : copied ? (
            <Check className="w-5 h-5" />
          ) : (
            <Share2 className="w-5 h-5" />
          )}
          {copied ? "Copied!" : "Share Session"}
        </button>
        <button
          onClick={handleSMSShare}
          className="w-12 h-12 flex items-center justify-center bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          title="Send via SMS"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleQuickShare}
      className={`flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors ${className}`}
      disabled={sharing}
    >
      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
        {sharing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : copied ? (
          <Check className="w-5 h-5 text-green-400" />
        ) : (
          <Share2 className="w-5 h-5" />
        )}
      </div>
      <span className="text-[10px]">{copied ? "Copied" : "Share"}</span>
    </button>
  );
};

export default QuickShare;
