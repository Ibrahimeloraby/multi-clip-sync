import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { toast } from "sonner";

const JoinSession = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const [sessionCode, setSessionCode] = useState(code || "");
  const [username, setUsername] = useState("");

  const handleJoinSession = () => {
    if (!sessionCode.trim()) {
      toast.error("Please enter a session code");
      return;
    }
    
    if (!username.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    toast.success("Joined session successfully!");
    navigate(`/session/${sessionCode}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-md mx-auto space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">Join Session</h1>
            <p className="text-muted-foreground">
              Enter the session code to start collaborating
            </p>
          </div>

          <Card className="glass-card p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Session Code</Label>
              <Input
                id="code"
                placeholder="e.g., ABC123"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="glass-card border-border font-mono text-lg"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Your Name</Label>
              <Input
                id="username"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-card border-border"
              />
            </div>

            <Button 
              onClick={handleJoinSession} 
              className="w-full gradient-primary"
              size="lg"
            >
              Join Session
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JoinSession;
