import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PENDING_SESSION_KEY = 'pending_session_code';

const JoinSession = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [sessionCode, setSessionCode] = useState(code || "");
  const [loading, setLoading] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [autoJoining, setAutoJoining] = useState(false);

  // Save session code and redirect to auth if not logged in
  useEffect(() => {
    if (authLoading) return;
    
    // If user came from QR code with a code in URL
    if (code && !user) {
      // Save the code so we can auto-join after auth
      localStorage.setItem(PENDING_SESSION_KEY, code);
      toast.info("Please sign in quickly to join the session");
      navigate('/auth');
      return;
    }

    // If user just logged in and has a pending session
    if (user) {
      const pendingCode = localStorage.getItem(PENDING_SESSION_KEY);
      if (pendingCode) {
        setSessionCode(pendingCode);
        localStorage.removeItem(PENDING_SESSION_KEY);
        // Auto-join the session
        setAutoJoining(true);
      }
    }
  }, [user, authLoading, code, navigate]);

  // Auto-join when we have user and pending code
  useEffect(() => {
    if (autoJoining && user && sessionCode) {
      handleJoinSession();
      setAutoJoining(false);
    }
  }, [autoJoining, user, sessionCode]);

  const checkProximity = (lat1: number, lon1: number, lat2: number, lon2: number): boolean => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c; // Distance in meters
    return distance <= 100; // Within 100m
  };

  const requestLocation = async (): Promise<{lat: number, lon: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        resolve(null);
        return;
      }

      setCheckingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setUserLocation(location);
          setCheckingLocation(false);
          resolve(location);
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Unable to get your location");
          setCheckingLocation(false);
          resolve(null);
        }
      );
    });
  };

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      toast.error("Please enter a session code");
      return;
    }

    if (!user) {
      // Save code and redirect to auth
      localStorage.setItem(PENDING_SESSION_KEY, sessionCode);
      toast.info("Please sign in to join");
      navigate('/auth');
      return;
    }

    setLoading(true);

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
        setLoading(false);
        return;
      }

      // Check contributor limit
      const { data: limitCheck } = await supabase
        .rpc('check_contributor_limit', { p_session_id: session.id });

      if (!limitCheck) {
        toast.error("Session has reached maximum contributors. Upgrade to Pro for more slots!");
        setLoading(false);
        return;
      }

      // Check if already joined
      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingParticipant) {
        toast.success("Joining session...");
        navigate(`/session/${session.id}?autoRecord=true`);
        setLoading(false);
        return;
      }

      // Check proximity for proximity mode
      if (session.mode === 'proximity') {
        if (!session.latitude || !session.longitude) {
          toast.error("Session location not set");
          setLoading(false);
          return;
        }

        const location = await requestLocation();
        
        if (!location) {
          toast.error("Location access required for proximity mode");
          setLoading(false);
          return;
        }

        const withinRange = checkProximity(
          location.lat,
          location.lon,
          session.latitude,
          session.longitude
        );

        if (!withinRange) {
          toast.error("You must be within 100m of the session location");
          setLoading(false);
          return;
        }
      }

      // Get user's device ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Add as participant
      const { error: participantError } = await supabase
        .from('session_participants')
        .insert({
          session_id: session.id,
          user_id: user.id,
          device_id: profile.device_id
        });

      if (participantError) throw participantError;

      toast.success("Joined! Starting camera...");
      navigate(`/session/${session.id}?autoRecord=true`);

    } catch (error: any) {
      console.error("Error joining session:", error);
      toast.error(error.message || "Failed to join session");
    } finally {
      setLoading(false);
    }
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
        <div className="max-w-md mx-auto space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">Join Session</h1>
            <p className="text-muted-foreground">
              Enter the time code to start collaborating
            </p>
          </div>

          {checkingLocation && (
            <Alert className="glass-card">
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Checking your location for proximity verification...
              </AlertDescription>
            </Alert>
          )}

          <Card className="glass-card p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Time Code</Label>
              <Input
                id="code"
                placeholder="e.g., TC-202501151430-A3F2"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="glass-card border-border font-mono text-lg"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Get this code from the session creator
              </p>
            </div>

            {userLocation && (
              <Alert className="glass-card">
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Location: {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleJoinSession} 
              className="w-full gradient-primary"
              size="lg"
              disabled={loading || checkingLocation}
            >
              {loading ? "Joining..." : checkingLocation ? "Checking Location..." : "Join Session"}
            </Button>

            <Alert className="glass-card">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Some sessions require you to be within 100m. Location access may be requested.
              </AlertDescription>
            </Alert>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JoinSession;