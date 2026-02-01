import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Copy, Check, Users, Share2, MessageCircle, Twitter, Facebook, Mail,
  Link as LinkIcon, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: (sessionId: string, timeCode: string) => void;
}

export const CreateSessionModal = ({ open, onOpenChange, onSessionCreated }: CreateSessionModalProps) => {
  const [sessionName, setSessionName] = useState("");
  const [mode, setMode] = useState<"global" | "proximity">("global");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    setLoading(true);
    try {
      // Ensure auth
      let userId: string;
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        userId = authSession.user.id;
      } else {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError || !anonData.user) throw new Error("Failed to authenticate");
        userId = anonData.user.id;
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const deviceId = crypto.randomUUID();
        await supabase.from('profiles').insert({
          id: userId,
          username: `Creator_${deviceId.slice(0, 6)}`,
          device_id: deviceId
        });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', userId)
        .single();

      const sessionId = crypto.randomUUID();
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12);
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionId + Date.now()));
      const hashArray = Array.from(new Uint8Array(hash));
      const random = hashArray.slice(0, 2).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const timeCode = `TC-${timestamp}-${random}`;

      let latitude = null, longitude = null;
      if (mode === 'proximity') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          toast.error("Location required for proximity mode");
          setLoading(false);
          return;
        }
      }

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          id: sessionId,
          owner_id: userId,
          name: sessionName,
          time_code: timeCode,
          mode,
          latitude,
          longitude,
          max_video_length: 30,
          tier: 'free'
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('session_limits').insert({
        session_id: session.id,
        max_contributors: 3,
        max_video_duration: 30
      });

      await supabase.from('session_participants').insert({
        session_id: session.id,
        user_id: userId,
        device_id: profile?.device_id || crypto.randomUUID()
      });

      onSessionCreated(session.id, timeCode);
      onOpenChange(false);
      setSessionName("");
      toast.success("Session created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Session Name</Label>
            <Input
              placeholder="My Recording Session"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mode</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "global" | "proximity")}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border">
                <RadioGroupItem value="global" id="global" />
                <Label htmlFor="global" className="flex-1 cursor-pointer">
                  <div className="font-medium">Global</div>
                  <div className="text-xs text-muted-foreground">Anyone can join</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border">
                <RadioGroupItem value="proximity" id="proximity" />
                <Label htmlFor="proximity" className="flex-1 cursor-pointer">
                  <div className="font-medium">Proximity</div>
                  <div className="text-xs text-muted-foreground">Within 100m only</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <Button onClick={handleCreate} className="w-full gradient-primary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface JoinSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinSessionModal = ({ open, onOpenChange }: JoinSessionModalProps) => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) {
      toast.error("Enter a session code");
      return;
    }
    setLoading(true);
    
    try {
      let userId: string;
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        userId = authSession.user.id;
      } else {
        const { data: anonData, error } = await supabase.auth.signInAnonymously();
        if (error || !anonData.user) throw new Error("Failed to authenticate");
        userId = anonData.user.id;
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const deviceId = crypto.randomUUID();
        await supabase.from('profiles').insert({
          id: userId,
          username: `Guest_${deviceId.slice(0, 6)}`,
          device_id: deviceId
        });
      }

      const { data: session, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('time_code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !session) {
        toast.error("Session not found or inactive");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', userId)
        .single();

      const { data: existing } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('session_participants').insert({
          session_id: session.id,
          user_id: userId,
          device_id: profile?.device_id || crypto.randomUUID()
        });
      }

      onOpenChange(false);
      navigate(`/session/${session.id}?autoRecord=true`);
    } catch (error: any) {
      toast.error(error.message || "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Join Session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Session Code</Label>
            <Input
              placeholder="TC-XXXXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </div>
          <Button onClick={handleJoin} className="w-full gradient-primary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Join Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ShareSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeCode: string;
  sessionName: string;
}

export const ShareSessionModal = ({ open, onOpenChange, timeCode, sessionName }: ShareSessionModalProps) => {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/q/${timeCode}`;
  const shareText = `Join my TimeCode session: ${sessionName}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(timeCode);
    toast.success("Code copied!");
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: sessionName, text: shareText, url: shareUrl });
    } catch (e: any) {
      if (e.name !== 'AbortError') toast.error("Share failed");
    }
  };

  const socialLinks = [
    { name: "WhatsApp", icon: MessageCircle, color: "bg-green-500", url: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
    { name: "X", icon: Twitter, color: "bg-black", url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { name: "Facebook", icon: Facebook, color: "bg-blue-600", url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}` },
    { name: "Email", icon: Mail, color: "bg-gray-600", url: `mailto:?subject=${encodeURIComponent(sessionName)}&body=${encodedText}%20${encodedUrl}` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Code display */}
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Session Code</p>
            <button onClick={copyCode} className="font-mono text-lg font-bold hover:text-primary transition-colors">
              {timeCode}
            </button>
          </div>

          {/* Native share */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button className="w-full gradient-primary" onClick={handleNativeShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share to Apps
            </Button>
          )}

          {/* Social links */}
          <div className="grid grid-cols-2 gap-2">
            {socialLinks.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium ${platform.color} hover:opacity-90 transition-opacity`}
              >
                <platform.icon className="w-4 h-4" />
                {platform.name}
              </a>
            ))}
          </div>

          {/* Copy link */}
          <Button variant="outline" className="w-full" onClick={copyLink}>
            {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <LinkIcon className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
