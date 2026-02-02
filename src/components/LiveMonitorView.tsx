import { useState, useEffect, useRef } from "react";
import { X, Users, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWebRTC } from "@/hooks/useWebRTC";

interface LiveMonitorViewProps {
  sessionId: string;
  userId: string;
  localStream: MediaStream | null;
  onClose: () => void;
}

interface Participant {
  id: string;
  username: string;
}

const LiveMonitorView = ({ sessionId, userId, localStream, onClose }: LiveMonitorViewProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [focusedPeer, setFocusedPeer] = useState<string | null>(null);
  const [mutedPeers, setMutedPeers] = useState<Set<string>>(new Set());
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { remoteStreams, isConnecting } = useWebRTC({
    sessionId,
    userId,
    localStream,
    enabled: true,
  });

  // Set up local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Fetch participant info
  useEffect(() => {
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("session_participants")
        .select("user_id, profiles(username)")
        .eq("session_id", sessionId)
        .neq("user_id", userId);

      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.user_id,
          username: p.profiles?.username || "Unknown",
        }));
        setParticipants(mapped);
      }
    };

    fetchParticipants();

    const channel = supabase
      .channel(`monitor-participants-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        () => fetchParticipants()
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [sessionId, userId]);

  const toggleMute = (peerId: string) => {
    setMutedPeers((prev) => {
      const next = new Set(prev);
      next.has(peerId) ? next.delete(peerId) : next.add(peerId);
      return next;
    });
  };

  const toggleFocus = (peerId: string) => {
    setFocusedPeer((prev) => (prev === peerId ? null : peerId));
  };

  const streamEntries = Array.from(remoteStreams.entries());
  const focusedStream = focusedPeer ? remoteStreams.get(focusedPeer) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Main view - Owner's camera or focused participant */}
      <div className="flex-1 relative bg-black">
        {focusedStream && focusedPeer ? (
          // Show focused participant full screen
          <>
            <VideoFeed stream={focusedStream} muted={mutedPeers.has(focusedPeer)} />
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 text-white px-3 py-1 rounded-full text-xs font-medium safe-area-mt">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {participants.find((p) => p.id === focusedPeer)?.username || "Participant"}
            </div>
            <button
              onClick={() => setFocusedPeer(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-library-accent/30 flex items-center justify-center safe-area-mt"
            >
              <Minimize2 className="w-5 h-5 text-library-accent" />
            </button>
          </>
        ) : (
          // Show owner's camera as main view
          <>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-library-accent text-black px-3 py-1 rounded-full text-xs font-bold safe-area-mt">
              YOU
            </div>
          </>
        )}

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-black/60 backdrop-blur-sm text-library-accent hover:bg-black/80 safe-area-mt"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Participant count badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-library-text px-3 py-1.5 rounded-full text-xs safe-area-mt">
          <Users className="w-4 h-4 text-library-accent" />
          <span>{streamEntries.length} live</span>
        </div>
      </div>

      {/* Bottom panel - Participant tiles */}
      <div className="bg-library-surface border-t border-library-border safe-area-pb">
        <div className="px-3 py-3">
          {isConnecting ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-library-accent border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-xs text-library-text-muted">Connecting...</span>
            </div>
          ) : streamEntries.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-center">
              <Users className="w-5 h-5 text-library-text-muted mr-2" />
              <span className="text-xs text-library-text-muted">Waiting for participants to go live...</span>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {/* Owner's thumbnail when viewing a participant */}
              {focusedPeer && localStream && (
                <button
                  onClick={() => setFocusedPeer(null)}
                  className="relative w-20 h-14 rounded-lg overflow-hidden border-2 border-library-accent shrink-0 touch-manipulation active:scale-95 transition-transform"
                >
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={(el) => { if (el) el.srcObject = localStream; }}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-library-accent text-black px-2 py-0.5 rounded text-[10px] font-bold">
                      YOU
                    </div>
                  </div>
                </button>
              )}

              {/* Participant tiles */}
              {streamEntries.map(([peerId, stream]) => {
                const participant = participants.find((p) => p.id === peerId);
                const isFocused = focusedPeer === peerId;

                return (
                  <div
                    key={peerId}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 ${
                      isFocused ? "border-2 border-library-accent" : "border border-library-border"
                    }`}
                  >
                    <button onClick={() => toggleFocus(peerId)} className="w-full h-full">
                      <VideoFeed stream={stream} muted={mutedPeers.has(peerId)} />
                    </button>

                    {/* Live indicator */}
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />

                    {/* Username */}
                    <div className="absolute bottom-0.5 left-0.5 bg-black/70 px-1 py-0.5 rounded text-[8px] text-library-accent font-medium truncate max-w-[70px]">
                      {participant?.username?.slice(0, 8) || "User"}
                    </div>

                    {/* Mute toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleMute(peerId); }}
                      className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      {mutedPeers.has(peerId) ? (
                        <VolumeX className="w-3 h-3 text-library-text-muted" />
                      ) : (
                        <Volume2 className="w-3 h-3 text-library-accent" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Video feed component
const VideoFeed = ({ stream, muted }: { stream: MediaStream; muted: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-cover"
    />
  );
};

export default LiveMonitorView;
