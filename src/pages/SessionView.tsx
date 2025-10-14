import { useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Play, Pause, Upload, Users } from "lucide-react";

const SessionView = () => {
  const { id } = useParams();
  const [isRecording, setIsRecording] = useState(false);
  
  const mockVideos = [
    { id: 1, user: "Alice", duration: "0:15", thumbnail: "" },
    { id: 2, user: "Bob", duration: "0:22", thumbnail: "" },
    { id: 3, user: "Charlie", duration: "0:18", thumbnail: "" }
  ];

  const mockParticipants = [
    { id: 1, name: "Alice", status: "active" },
    { id: 2, name: "Bob", status: "active" },
    { id: 3, name: "Charlie", status: "inactive" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Session: {id}</h1>
              <p className="text-muted-foreground">Collaborative recording session</p>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{mockParticipants.length} participants</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Recording Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Camera Preview */}
              <Card className="glass-card p-6 space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto">
                      <Video className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <p className="text-muted-foreground">Camera preview will appear here</p>
                  </div>
                </div>
                
                <div className="flex gap-2 justify-center">
                  <Button 
                    size="lg"
                    variant={isRecording ? "destructive" : "default"}
                    className={!isRecording ? "gradient-primary" : ""}
                    onClick={() => setIsRecording(!isRecording)}
                  >
                    {isRecording ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start Recording
                      </>
                    )}
                  </Button>
                  <Button size="lg" variant="secondary">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload
                  </Button>
                </div>
              </Card>

              {/* Timeline */}
              <Card className="glass-card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Multi-Angle Timeline</h2>
                <div className="space-y-3">
                  {mockVideos.map((video) => (
                    <div key={video.id} className="glass-card p-4 rounded-lg flex items-center justify-between hover-lift">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Video className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{video.user}</p>
                          <p className="text-sm text-muted-foreground">{video.duration}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary">
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sidebar - Participants */}
            <div className="space-y-6">
              <Card className="glass-card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Participants</h2>
                <div className="space-y-3">
                  {mockParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-foreground">
                            {participant.name[0]}
                          </span>
                        </div>
                        <span className="font-medium">{participant.name}</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        participant.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'
                      }`} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="glass-card p-6 space-y-4">
                <h2 className="text-xl font-semibold">Session Info</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-mono font-medium">{id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tier:</span>
                    <span className="font-medium text-primary">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Length:</span>
                    <span className="font-medium">30s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Videos:</span>
                    <span className="font-medium">{mockVideos.length}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionView;
