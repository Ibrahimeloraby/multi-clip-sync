import { useState, useEffect, useRef } from "react";
import { X, Users, Volume2, VolumeX, Maximize2, Minimize2, MapPin, Navigation } from "lucide-react";
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

interface ParticipantLocation {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

const LiveMonitorView = ({ sessionId, userId, localStream, onClose }: LiveMonitorViewProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [focusedPeer, setFocusedPeer] = useState<string | null>(null);
  const [mutedPeers, setMutedPeers] = useState<Set<string>>(new Set());
  const [showLocations, setShowLocations] = useState(false);
  const [participantLocations, setParticipantLocations] = useState<Map<string, ParticipantLocation>>(new Map());
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
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

  // Real-time location tracking with Presence
  useEffect(() => {
    const presenceChannel = supabase.channel(`location-${sessionId}`);

    // Track and share my location
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setMyLocation({ lat: latitude, lng: longitude });
        
        // Share location via presence
        await presenceChannel.track({
          user_id: userId,
          latitude,
          longitude,
          accuracy,
          timestamp: Date.now(),
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Listen for other participants' locations
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const locations = new Map<string, ParticipantLocation>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id && p.latitude && p.longitude) {
              locations.set(p.user_id, {
                userId: p.user_id,
                latitude: p.latitude,
                longitude: p.longitude,
                accuracy: p.accuracy || 0,
                timestamp: p.timestamp || Date.now(),
              });
            }
          });
        });
        
        setParticipantLocations(locations);
      })
      .subscribe();

    return () => {
      navigator.geolocation.clearWatch(watchId);
      presenceChannel.unsubscribe();
    };
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

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
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
            
            {/* Show distance to focused participant */}
            {myLocation && participantLocations.has(focusedPeer) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs safe-area-mt">
                <Navigation className="w-3.5 h-3.5 text-library-accent" />
                {formatDistance(calculateDistance(
                  myLocation.lat,
                  myLocation.lng,
                  participantLocations.get(focusedPeer)!.latitude,
                  participantLocations.get(focusedPeer)!.longitude
                ))} away
              </div>
            )}
            
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

        {/* Close button - larger touch target for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/60 backdrop-blur-sm border border-library-accent/30 flex items-center justify-center active:bg-black/80 touch-manipulation safe-area-mt"
          aria-label="Close monitor"
        >
          <X className="w-6 h-6 text-library-accent" />
        </button>

        {/* Participant count and location toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 safe-area-mt">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm text-library-text px-3 py-1.5 rounded-full text-xs">
            <Users className="w-4 h-4 text-library-accent" />
            <span>{streamEntries.length} live</span>
          </div>
          
          {/* Location toggle button */}
          <button
            onClick={() => setShowLocations(!showLocations)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
              showLocations 
                ? 'bg-library-accent text-black' 
                : 'bg-black/60 backdrop-blur-sm text-library-text'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Locations</span>
          </button>
        </div>

        {/* Location panel overlay */}
        {showLocations && (
          <div className="absolute bottom-20 left-4 right-4 bg-black/80 backdrop-blur-md rounded-xl p-3 max-h-[40%] overflow-auto">
            <h3 className="text-xs font-bold text-library-accent mb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Participant Locations
            </h3>
            
            {participantLocations.size === 0 ? (
              <p className="text-xs text-library-text-muted py-2">
                Waiting for location data...
              </p>
            ) : (
              <div className="space-y-2">
                {Array.from(participantLocations.entries()).map(([oderId, location]) => {
                  if (userId === location.userId) return null; // Skip self
                  const participant = participants.find(p => p.id === location.userId);
                  const distance = myLocation 
                    ? calculateDistance(myLocation.lat, myLocation.lng, location.latitude, location.longitude)
                    : null;
                  
                  return (
                    <div 
                      key={location.userId}
                      className="flex items-center justify-between p-2 bg-white/10 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm text-white font-medium">
                          {participant?.username || "Unknown"}
                        </span>
                      </div>
                      {distance !== null && (
                        <div className="flex items-center gap-1 text-xs text-library-accent">
                          <Navigation className="w-3 h-3" />
                          {formatDistance(distance)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
              {/* Owner's thumbnail - tap to return to own view */}
              {focusedPeer && localStream && (
                <div className="relative w-20 h-14 shrink-0">
                  {/* Video layer - no interaction */}
                  <div className="absolute inset-0 rounded-lg overflow-hidden border-2 border-library-accent pointer-events-none">
                    <video
                      autoPlay
                      playsInline
                      muted
                      ref={(el) => { if (el && localStream) el.srcObject = localStream; }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="bg-library-accent text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-md">
                        YOU
                      </div>
                    </div>
                  </div>
                  {/* Invisible click layer on top */}
                  <button
                    type="button"
                    onClick={() => {
                      console.log("YOU button tapped");
                      setFocusedPeer(null);
                    }}
                    className="absolute inset-0 z-10 rounded-lg touch-manipulation active:bg-white/10 transition-colors"
                    aria-label="Return to your camera"
                  />
                </div>
              )}

              {/* Participant tiles */}
              {streamEntries.map(([peerId, stream]) => {
                const participant = participants.find((p) => p.id === peerId);
                const isFocused = focusedPeer === peerId;
                const hasLocation = participantLocations.has(peerId);
                const distance = hasLocation && myLocation
                  ? calculateDistance(
                      myLocation.lat,
                      myLocation.lng,
                      participantLocations.get(peerId)!.latitude,
                      participantLocations.get(peerId)!.longitude
                    )
                  : null;

                return (
                  <div
                    key={peerId}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 ${
                      isFocused ? "border-2 border-library-accent" : "border border-library-border"
                    }`}
                  >
                    {/* Video layer - no interaction */}
                    <div className="absolute inset-0 pointer-events-none">
                      <VideoFeed stream={stream} muted={mutedPeers.has(peerId)} />
                    </div>

                    {/* Invisible click layer for focus toggle */}
                    <button 
                      type="button"
                      onClick={() => {
                        console.log("Participant clicked:", peerId);
                        toggleFocus(peerId);
                      }} 
                      className="absolute inset-0 z-10 touch-manipulation"
                      aria-label={`Focus on ${participant?.username || 'participant'}`}
                    />

                    {/* Live indicator */}
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-destructive animate-pulse pointer-events-none z-20" />

                    {/* Location indicator */}
                    {hasLocation && (
                      <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 bg-black/70 px-1 py-0.5 rounded text-[8px] text-library-accent pointer-events-none z-20">
                        <MapPin className="w-2 h-2" />
                        {distance !== null && formatDistance(distance)}
                      </div>
                    )}

                    {/* Username */}
                    <div className="absolute bottom-0.5 left-0.5 bg-black/70 px-1 py-0.5 rounded text-[8px] text-library-accent font-medium truncate max-w-[70px] pointer-events-none z-20">
                      {participant?.username?.slice(0, 8) || "User"}
                    </div>

                    {/* Mute toggle */}
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        console.log("Mute toggled for:", peerId);
                        toggleMute(peerId); 
                      }}
                      className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center z-30 touch-manipulation"
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
