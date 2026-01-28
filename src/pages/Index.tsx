import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import SessionCard from "@/components/SessionCard";
import { ArrowRight, Play, Users, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import heroImage from "@/assets/hero-bg.jpg";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SessionData {
  id: string;
  name: string;
  time_code: string;
  tier: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
}

const Index = () => {
  const [sessionCode, setSessionCode] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [participatedSessions, setParticipatedSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      fetchUserSessions();
    }
  }, [user]);

  const fetchUserSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch owned sessions
      const { data: ownedData, error: ownedError } = await supabase
        .from('sessions')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;
      setSessions(ownedData || []);

      // Fetch participated sessions (not owned)
      const { data: participantData, error: participantError } = await supabase
        .from('session_participants')
        .select('session_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      if (participantData && participantData.length > 0) {
        const sessionIds = participantData.map(p => p.session_id);
        const { data: participatedData, error: participatedError } = await supabase
          .from('sessions')
          .select('*')
          .in('id', sessionIds)
          .neq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (participatedError) throw participatedError;
        setParticipatedSessions(participatedData || []);
      }

      // Fetch video counts for all sessions
      const allSessionIds = [
        ...(ownedData || []).map(s => s.id),
        ...(participantData || []).map(p => p.session_id)
      ];

      if (allSessionIds.length > 0) {
        const { data: videos, error: videosError } = await supabase
          .from('videos')
          .select('session_id')
          .in('session_id', allSessionIds);

        if (!videosError && videos) {
          const counts: Record<string, number> = {};
          videos.forEach(v => {
            counts[v.session_id] = (counts[v.session_id] || 0) + 1;
          });
          setVideoCounts(counts);
        }

        // Fetch participant counts
        const { data: participants, error: participantsError } = await supabase
          .from('session_participants')
          .select('session_id')
          .in('session_id', allSessionIds);

        if (!participantsError && participants) {
          const counts: Record<string, number> = {};
          participants.forEach(p => {
            counts[p.session_id] = (counts[p.session_id] || 0) + 1;
          });
          setParticipantCounts(counts);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const allUserSessions = [...sessions, ...participatedSessions];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              Create <span className="gradient-text">Multi-Angle</span>
              <br />Videos Together
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Collaborate with anyone, anywhere. Record synchronized video clips and merge them into a stunning multi-angle timeline.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/create">
                <Button size="lg" className="gradient-primary text-lg px-8 group">
                  Start Creating
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Enter session code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  className="glass-card border-border max-w-[200px]"
                />
                <Link to={`/join/${sessionCode || 'demo'}`}>
                  <Button variant="secondary">Join</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-2xl space-y-4 hover-lift">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Easy Recording</h3>
              <p className="text-muted-foreground">
                Record videos directly in your browser. No app downloads required.
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl space-y-4 hover-lift">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Collaborative</h3>
              <p className="text-muted-foreground">
                Share a code and let anyone join your session from anywhere.
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl space-y-4 hover-lift">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Synced Timeline</h3>
              <p className="text-muted-foreground">
                All clips automatically sync into a multi-angle timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* User's Sessions */}
      {user && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Your Sessions</h2>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : allUserSessions.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {allUserSessions.map((session) => (
                  <SessionCard 
                    key={session.id} 
                    id={session.id}
                    name={session.name}
                    code={session.time_code}
                    participants={participantCounts[session.id] || 0}
                    videosCount={videoCounts[session.id] || 0}
                    duration="--"
                    tier={session.tier as 'free' | 'pro' | 'enterprise'}
                    isOwner={session.owner_id === user.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No sessions yet. Create your first session!</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
