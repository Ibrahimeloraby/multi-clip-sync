import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import SessionCard from "@/components/SessionCard";
import { ArrowRight, Users, Clock, Loader2, Zap, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
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
      const { data: ownedData, error: ownedError } = await supabase
        .from('sessions')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;
      setSessions(ownedData || []);

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

      const allSessionIds = [
        ...(ownedData || []).map(s => s.id),
        ...(participantData || []).map(p => p.session_id)
      ];

      if (allSessionIds.length > 0) {
        const { data: videos } = await supabase
          .from('videos')
          .select('session_id')
          .in('session_id', allSessionIds);

        if (videos) {
          const counts: Record<string, number> = {};
          videos.forEach(v => {
            counts[v.session_id] = (counts[v.session_id] || 0) + 1;
          });
          setVideoCounts(counts);
        }

        const { data: participants } = await supabase
          .from('session_participants')
          .select('session_id')
          .in('session_id', allSessionIds);

        if (participants) {
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
      <section className="relative pt-28 pb-16 px-4 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-primary">Multi-Angle Recording</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
              Record Together,
              <br />
              <span className="gradient-text">Sync Perfectly</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Create synchronized multi-angle videos with anyone, anywhere. 
              Share a code, record, and watch the magic happen.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link to="/create">
                <Button size="lg" className="gradient-primary text-lg px-8 shadow-lg hover:shadow-xl transition-shadow group">
                  <div className="w-2 h-2 rounded-full bg-white/90 mr-3 animate-pulse" />
                  Start Recording
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Session code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  className="max-w-[180px] bg-card shadow-sm"
                />
                <Link to={sessionCode ? `/join/${sessionCode}` : '/join'}>
                  <Button variant="outline" className="shadow-sm">
                    Join
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border">
              <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Instant Setup</h3>
              <p className="text-muted-foreground text-sm">
                No downloads needed. Start recording directly in your browser.
              </p>
            </div>
            
            <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border">
              <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mb-4">
                <Share2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Easy Sharing</h3>
              <p className="text-muted-foreground text-sm">
                Share a magic link and anyone can join your session instantly.
              </p>
            </div>
            
            <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border">
              <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Auto Sync</h3>
              <p className="text-muted-foreground text-sm">
                All clips sync automatically into a multi-angle timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* User's Sessions */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground">Your Sessions</h2>
            {allUserSessions.length > 0 && (
              <Link to="/create">
                <Button variant="outline" size="sm">
                  New Session
                </Button>
              </Link>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : allUserSessions.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
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
                  isOwner={user ? session.owner_id === user.id : false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg relative">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary-foreground" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive border-2 border-background" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Create your first session to start recording multi-angle videos
              </p>
              <Link to="/create">
                <Button className="gradient-primary shadow-md">
                  Create Your First Session
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
