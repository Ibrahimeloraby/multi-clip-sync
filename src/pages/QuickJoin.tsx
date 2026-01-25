import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PENDING_SESSION_KEY = 'pending_session_code';

const QuickJoin = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joiningSession, setJoiningSession] = useState(false);

  // If already logged in, go directly to join flow
  useEffect(() => {
    if (!authLoading && user && code) {
      joinSessionAndRecord(code);
    }
  }, [user, authLoading, code]);

  const joinSessionAndRecord = async (sessionCode: string) => {
    setJoiningSession(true);
    
    try {
      // Find session by time code
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('time_code', sessionCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (sessionError || !session) {
        toast.error("Session not found or inactive");
        navigate('/');
        return;
      }

      // Check contributor limit
      const { data: limitCheck } = await supabase
        .rpc('check_contributor_limit', { p_session_id: session.id });

      if (!limitCheck) {
        toast.error("Session is full!");
        navigate('/');
        return;
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error("Authentication error");
        return;
      }

      // Check if already joined
      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!existingParticipant) {
        // Get user's device ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('device_id')
          .eq('id', currentUser.id)
          .single();

        if (profile) {
          // Add as participant
          await supabase
            .from('session_participants')
            .insert({
              session_id: session.id,
              user_id: currentUser.id,
              device_id: profile.device_id
            });
        }
      }

      // Navigate to session with auto-record
      toast.success("Starting camera...");
      navigate(`/session/${session.id}?autoRecord=true`);

    } catch (error: any) {
      console.error("Error joining session:", error);
      toast.error(error.message || "Failed to join");
    } finally {
      setJoiningSession(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username }
          }
        });

        if (error) throw error;

        if (data.user) {
          // Create profile
          const deviceId = crypto.randomUUID();
          await supabase.from('profiles').insert({
            id: data.user.id,
            username: username || email.split('@')[0],
            device_id: deviceId
          });

          toast.success("Account created!");
          
          if (code) {
            // Small delay for auth to propagate
            setTimeout(() => joinSessionAndRecord(code), 500);
          }
        }
      } else {
        // Sign in flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        toast.success("Signed in!");
        
        if (code) {
          setTimeout(() => joinSessionAndRecord(code), 500);
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth or joining
  if (authLoading || joiningSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Video className="w-8 h-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">
            {joiningSession ? "Starting camera..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm glass-card p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <Video className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Quick Join</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Create account to start recording" : "Sign in to start recording"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-card"
                required
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-card"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-card"
              required
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isSignUp ? "Creating..." : "Signing in..."}
              </>
            ) : (
              isSignUp ? "Create & Start Recording" : "Sign In & Start Recording"
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "New here? Create account"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default QuickJoin;
