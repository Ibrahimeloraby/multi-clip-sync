import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const CreateSession = () => {
  const navigate = useNavigate();
  const [sessionName, setSessionName] = useState("");
  const [tier, setTier] = useState("free");
  const [copied, setCopied] = useState(false);
  const [sessionCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  const tierLimits = {
    free: "30 seconds",
    pro: "2 minutes",
    enterprise: "10 minutes"
  };

  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }
    
    toast.success("Session created successfully!");
    navigate(`/session/${sessionCode}`);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    toast.success("Session code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

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
              <Label>Your Session Code</Label>
              <div className="flex gap-2">
                <Input
                  value={sessionCode}
                  readOnly
                  className="glass-card border-border font-mono text-lg"
                />
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={copyCode}
                  className="shrink-0"
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
            >
              Create Session
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateSession;
