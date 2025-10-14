import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import SessionCard from "@/components/SessionCard";
import { ArrowRight, Play, Users, Clock } from "lucide-react";
import { useState } from "react";
import heroImage from "@/assets/hero-bg.jpg";

const Index = () => {
  const [sessionCode, setSessionCode] = useState("");

  const mockSessions = [
    {
      id: "1",
      name: "Weekend Vlog Collab",
      code: "ABC123",
      participants: 4,
      videosCount: 12,
      duration: "30s",
      tier: "free" as const
    },
    {
      id: "2",
      name: "Product Launch Video",
      code: "XYZ789",
      participants: 8,
      videosCount: 24,
      duration: "2m",
      tier: "pro" as const
    }
  ];

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

      {/* Recent Sessions */}
      {mockSessions.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Recent Sessions</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {mockSessions.map((session) => (
                <SessionCard key={session.id} {...session} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
