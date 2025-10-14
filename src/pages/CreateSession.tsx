import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CreateSession = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [sessionName, setSessionName] = useState("");
  const [tier, setTier] = useState("free");
  const [mode, setMode] = useState<"global" | "proximity">("global");
  const [copied, setCopied] = useState(false);
  const [timeCode, setTimeCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to create a session");
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const tierLimits = {
    free: "30 seconds",
    pro: "2 minutes",
    enterprise: "10 minutes"
  };

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    if (!user) {
      toast.error("Please sign in first");
      navigate('/auth');
      return;
    }

    setLoading(true);

    try {
      // Get user's device ID from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Create session
      const sessionId = crypto.randomUUID();
      const generatedTimeCode = await generateTimeCode(sessionId, profile.device_id);

      const maxVideoLength = tier === 'free' ? 30 : tier === 'pro' ? 120 : 600;

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          id: sessionId,
          owner_id: user.id,
          name: sessionName,
          time_code: generatedTimeCode,
          mode,
          max_video_length: maxVideoLength,
          tier
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add owner as participant
      await supabase
        .from('session_participants')
        .insert({
          session_id: session.id,
          user_id: user.id,
          device_id: profile.device_id
        });

      setTimeCode(generatedTimeCode);
      toast.success("Session created successfully!");
      
      // Navigate after a short delay to show the time code
      setTimeout(() => {
        navigate(`/session/${session.id}`);
      }, 2000);

    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const generateTimeCode = async (sessionUuid: string, deviceUuid: string): Promise<string> => {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12);
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(sessionUuid + deviceUuid + Date.now())
    );
    const hashArray = Array.from(new Uint8Array(hash));
    const random = hashArray.slice(0, 2)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    
    return `TC-${timestamp}-${random}`;
  };

  const copyCode = () => {
    if (!timeCode) return;
    navigator.clipboard.writeText(timeCode);
    setCopied(true);
    toast.success("Time code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">Create New Session</h1>
            <p className="text-muted-foreground">
              Set up your collaborative video session and share with others
            </p>
          </div>

          <Card className="glass-card p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                placeholder="e.g., Weekend Vlog Collab"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="glass-card border-border"
              />
            </div>

            <div className="space-y-4">
              <Label>Session Mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "global" | "proximity")} className="space-y-3">
                <div className="flex items-center space-x-3 glass-card p-4 rounded-lg hover-lift cursor-pointer">
                  <RadioGroupItem value="global" id="global" />
                  <Label htmlFor="global" className="flex-1 cursor-pointer">
                    <div className="font-medium text-foreground">Global Mode</div>
                    <div className="text-sm text-muted-foreground">Collaborate from anywhere in the world</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 glass-card p-4 rounded-lg hover-lift cursor-pointer">
                  <RadioGroupItem value="proximity" id="proximity" />
                  <Label htmlFor="proximity" className="flex-1 cursor-pointer">
                    <div className="font-medium text-foreground">Proximity Mode</div>
                    <div className="text-sm text-muted-foreground">Requires users within 100m radius</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label>Select Tier</Label>
              <RadioGroup value={tier} onValueChange={setTier} className="space-y-3">
                <div className="flex items-center space-x-3 glass-card p-4 rounded-lg hover-lift cursor-pointer">
                  <RadioGroupItem value="free" id="free" />
                  <Label htmlFor="free" className="flex-1 cursor-pointer">
                    <div className="font-medium text-foreground">Free</div>
                    <div className="text-sm text-muted-foreground">Max video length: {tierLimits.free}</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 glass-card p-4 rounded-lg hover-lift cursor-pointer border-secondary">
                  <RadioGroupItem value="pro" id="pro" />
                  <Label htmlFor="pro" className="flex-1 cursor-pointer">
                    <div className="font-medium text-foreground">Pro</div>
                    <div className="text-sm text-muted-foreground">Max video length: {tierLimits.pro}</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 glass-card p-4 rounded-lg hover-lift cursor-pointer border-primary">
                  <RadioGroupItem value="enterprise" id="enterprise" />
                  <Label htmlFor="enterprise" className="flex-1 cursor-pointer">
                    <div className="font-medium text-foreground">Enterprise</div>
                    <div className="text-sm text-muted-foreground">Max video length: {tierLimits.enterprise}</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Your Time Code</Label>
              <div className="flex gap-2">
                <Input
                  value={timeCode || "Will be generated..."}
                  readOnly
                  className="glass-card border-border font-mono text-lg"
                />
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={copyCode}
                  className="shrink-0"
                  disabled={!timeCode}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Share this code with collaborators</p>
            </div>

            <Button 
              onClick={handleCreateSession} 
              className="w-full gradient-primary"
              size="lg"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Session"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateSession;
