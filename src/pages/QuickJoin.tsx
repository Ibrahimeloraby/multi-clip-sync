import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const QuickJoin = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const [status, setStatus] = useState("Preparing...");

  useEffect(() => {
    if (code) {
      handleGuestJoin(code);
    } else {
      toast.error("No session code provided");
      navigate('/');
    }
  }, [code]);

  const handleGuestJoin = async (sessionCode: string) => {
    try {
      setStatus("Checking session...");

      // First, find the session to validate it exists
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('time_code', sessionCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (sessionError || !session) {
        toast.error("Session not found or inactive");
        navigate('/');
        return;
      }

      setStatus("Joining as guest...");

      // Check if user is already authenticated
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      let userId: string;

      if (authSession?.user) {
        // User already signed in
        userId = authSession.user.id;
      } else {
        // Sign in anonymously
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        
        if (anonError || !anonData.user) {
          console.error("Anonymous sign in error:", anonError);
          toast.error("Failed to join as guest");
          navigate('/');
          return;
        }

        userId = anonData.user.id;

        // Create guest profile
        const deviceId = crypto.randomUUID();
        const guestName = `Guest_${deviceId.slice(0, 6)}`;

        await supabase.from('profiles').insert({
          id: userId,
          username: guestName,
          device_id: deviceId
        });
      }

      setStatus("Starting camera...");

      // Check contributor limit
      const { data: limitCheck } = await supabase
        .rpc('check_contributor_limit', { p_session_id: session.id });

      if (!limitCheck) {
        toast.error("Session is full!");
        navigate('/');
        return;
      }

      // Get profile for device ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', userId)
        .single();

      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingParticipant && profile) {
        // Add as participant
        await supabase
          .from('session_participants')
          .insert({
            session_id: session.id,
            user_id: userId,
            device_id: profile.device_id
          });
      }

      // Navigate to session with auto-record
      toast.success("Starting camera...");
      navigate(`/session/${session.id}?autoRecord=true`);

    } catch (error: any) {
      console.error("Error joining session:", error);
      toast.error(error.message || "Failed to join");
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Video className="w-8 h-8 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground flex items-center gap-2 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          {status}
        </p>
      </div>
    </div>
  );
};

export default QuickJoin;
