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

  const { remoteStreams, isConnecting } = useWebRTC({
    sessionId,
    userId,
    localStream,
    enabled: true,
  });

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

    // Subscribe to realtime participant changes
    const channel = supabase
      .channel(`monitor-participants-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchParticipants()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, userId]);

  const toggleMute = (peerId: string) => {
    setMutedPeers((prev) => {
      const next = new Set(prev);
      if (next.has(peerId)) {
        next.delete(peerId);
      } else {
        next.add(peerId);
      }
      return next;
    });
  };

  const toggleFocus = (peerId: string) => {
    setFocusedPeer((prev) => (prev === peerId ? null : peerId));
  };

  const streamEntries = Array.from(remoteStreams.entries());
  const focusedStream = focusedPeer ? remoteStreams.get(focusedPeer) : null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-library-surface border-b border-library-border safe-area-pt">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-library-accent/20 border border-library-accent flex items-center justify-center">
            <Users className="w-5 h-5 text-library-accent" />
          </div>
          <div>
            <h1 className="text-library-text font-semibold">Live Monitor</h1>
            <p className="text-xs text-library-text-muted">
              {streamEntries.length} live feed{streamEntries.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full text-library-accent hover:bg-library-surface-hover"
        >
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {isConnecting ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 border-2 border-library-accent border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-library-text-muted">Connecting to participants...</p>
          </div>
        ) : streamEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-library-surface border-2 border-library-accent/50 flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-library-accent/50" />
            </div>
            <h3 className="text-library-text font-semibold mb-1">No live feeds yet</h3>
            <p className="text-sm text-library-text-muted">
              Participants will appear here when they go live
            </p>
          </div>
        ) : focusedStream && focusedPeer ? (
          // Focused view - single large video
          <div className="h-full flex flex-col gap-3">
            <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-library-accent">
              <VideoFeed
                stream={focusedStream}
                muted={mutedPeers.has(focusedPeer)}
              />
              <FeedOverlay
                peerId={focusedPeer}
                username={participants.find((p) => p.id === focusedPeer)?.username || "User"}
                isMuted={mutedPeers.has(focusedPeer)}
                onToggleMute={() => toggleMute(focusedPeer)}
                onToggleFocus={() => toggleFocus(focusedPeer)}
                isFocused
              />
            </div>
            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {streamEntries
                .filter(([id]) => id !== focusedPeer)
                .map(([peerId, stream]) => (
                  <button
                    key={peerId}
                    onClick={() => toggleFocus(peerId)}
                    className="w-24 h-16 rounded-lg overflow-hidden border border-library-border shrink-0 relative"
                  >
                    <VideoFeed stream={stream} muted />
                    <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-library-accent">
                      {participants.find((p) => p.id === peerId)?.username?.slice(0, 8) || "User"}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          // Grid view
          <div
            className={`grid gap-3 h-full ${
              streamEntries.length === 1
                ? "grid-cols-1"
                : streamEntries.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : streamEntries.length <= 4
                ? "grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {streamEntries.map(([peerId, stream]) => (
              <div
                key={peerId}
                className="relative rounded-xl overflow-hidden border border-library-border bg-library-surface aspect-video"
              >
                <VideoFeed stream={stream} muted={mutedPeers.has(peerId)} />
                <FeedOverlay
                  peerId={peerId}
                  username={participants.find((p) => p.id === peerId)?.username || "User"}
                  isMuted={mutedPeers.has(peerId)}
                  onToggleMute={() => toggleMute(peerId)}
                  onToggleFocus={() => toggleFocus(peerId)}
                  isFocused={false}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer status */}
      <footer className="px-4 py-3 bg-library-surface border-t border-library-border safe-area-pb">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-library-text-muted">
            Monitoring {streamEntries.length} participant{streamEntries.length !== 1 ? "s" : ""}
          </span>
        </div>
      </footer>
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

// Overlay with controls
const FeedOverlay = ({
  peerId,
  username,
  isMuted,
  onToggleMute,
  onToggleFocus,
  isFocused,
}: {
  peerId: string;
  username: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleFocus: () => void;
  isFocused: boolean;
}) => {
  return (
    <>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Live indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-destructive/90 text-white px-2 py-0.5 rounded-full text-xs font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </div>

      {/* Username */}
      <div className="absolute bottom-2 left-2 text-library-accent font-semibold text-sm">
        @{username}
      </div>

      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex gap-1.5">
        <button
          onClick={onToggleMute}
          className="w-8 h-8 rounded-full bg-library-surface/80 backdrop-blur-sm border border-library-accent/30 flex items-center justify-center"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-library-accent" />
          ) : (
            <Volume2 className="w-4 h-4 text-library-accent" />
          )}
        </button>
        <button
          onClick={onToggleFocus}
          className="w-8 h-8 rounded-full bg-library-surface/80 backdrop-blur-sm border border-library-accent/30 flex items-center justify-center"
        >
          {isFocused ? (
            <Minimize2 className="w-4 h-4 text-library-accent" />
          ) : (
            <Maximize2 className="w-4 h-4 text-library-accent" />
          )}
        </button>
      </div>
    </>
  );
};

export default LiveMonitorView;
