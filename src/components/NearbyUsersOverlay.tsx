import { useState, useEffect } from "react";
import { X, Radio, MapPin, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NearbyUsersOverlayProps {
  userId: string;
  onClose: () => void;
  onJoinSession?: (sessionId: string, timeCode: string, sessionName: string) => void;
}

interface NearbySession {
  id: string;
  name: string;
  time_code: string;
  distance: number;
  is_live: boolean;
  participant_count: number;
}

const NearbyUsersOverlay = ({ userId, onClose, onJoinSession }: NearbyUsersOverlayProps) => {
  const [nearbySessions, setNearbySessions] = useState<NearbySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const getCurrentLocationAndFetch = async () => {
      if (!navigator.geolocation) {
        if (isMounted) {
          toast.error('Location not available');
          setLoading(false);
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isMounted) return;
          const { latitude, longitude } = position.coords;
          await fetchNearbySessions(latitude, longitude, isMounted);
        },
        (error) => {
          if (!isMounted) return;
          console.error('Geolocation error:', error);
          toast.error('Could not get location');
          setLoading(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    getCurrentLocationAndFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    onClose();
  };

  const fetchNearbySessions = async (lat: number, lng: number, isMounted: boolean = true) => {
    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name, time_code, latitude, longitude, is_live, is_active')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!isMounted) return;

      if (sessions) {
        // Get participant counts
        const sessionIds = sessions.map(s => s.id);
        const { data: participants } = await supabase
          .from('session_participants')
          .select('session_id')
          .in('session_id', sessionIds);

        if (!isMounted) return;

        const countMap: Record<string, number> = {};
        participants?.forEach(p => {
          countMap[p.session_id] = (countMap[p.session_id] || 0) + 1;
        });

        const withDistance = sessions
          .map(s => ({
            id: s.id,
            name: s.name,
            time_code: s.time_code,
            is_live: s.is_live,
            distance: calculateDistance(lat, lng, s.latitude!, s.longitude!),
            participant_count: countMap[s.id] || 0,
          }))
          .filter(s => s.distance <= 10) // Within 10km
          .sort((a, b) => a.distance - b.distance);

        setNearbySessions(withDistance);
      }
    } catch (error) {
      console.error('Failed to fetch nearby:', error);
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Main view */}
      <div className="flex-1 relative">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between safe-area-mt">
          <div className="flex items-center gap-2 bg-[#FFFF00] text-black px-3 py-1.5 rounded-full text-xs font-bold">
            <Radio className="w-4 h-4" />
            Nearby Sessions
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-full bg-black/60 backdrop-blur-sm text-[#FFFF00] hover:bg-black/80 border border-[#FFFF00]/30"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Centered content */}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          {loading ? (
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#FFFF00] mx-auto mb-3" />
              <p className="text-white/60 text-sm">Finding nearby TimeCode users...</p>
            </div>
          ) : nearbySessions.length === 0 ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#FFFF00]/20 flex items-center justify-center mx-auto mb-3 border border-[#FFFF00]/30">
                <MapPin className="w-8 h-8 text-[#FFFF00]" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">No Sessions Nearby</h2>
              <p className="text-sm text-white/60">No active sessions within 10km</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#FFFF00]/20 flex items-center justify-center mx-auto mb-3 border border-[#FFFF00]/30">
                <Radio className="w-8 h-8 text-[#FFFF00]" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">
                {nearbySessions.length} Session{nearbySessions.length !== 1 ? 's' : ''} Nearby
              </h2>
              <p className="text-sm text-white/60">Tap to join</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel - Session list */}
      <div className="bg-black border-t border-[#FFFF00]/20 safe-area-pb max-h-[40vh] overflow-auto">
        <div className="px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#FFFF00]/50" />
            </div>
          ) : nearbySessions.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-center">
              <span className="text-sm text-white/40">Pull down to refresh</span>
            </div>
          ) : (
            nearbySessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  onJoinSession?.(session.id, session.time_code, session.name);
                  handleClose();
                }}
                className="w-full flex items-center gap-3 p-3 bg-[#FFFF00]/10 border border-[#FFFF00]/20 rounded-xl active:scale-[0.98] transition-transform text-left hover:bg-[#FFFF00]/20"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-black border border-[#FFFF00]/30 flex items-center justify-center">
                    {session.is_live ? (
                      <Radio className="w-5 h-5 text-red-500" />
                    ) : (
                      <User className="w-5 h-5 text-[#FFFF00]" />
                    )}
                  </div>
                  {session.is_live && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{session.name}</p>
                  <p className="text-xs text-white/50">
                    {session.participant_count} participant{session.participant_count !== 1 ? 's' : ''} • {formatDistance(session.distance)} away
                  </p>
                </div>
                <div className="text-[#FFFF00] text-sm font-bold">
                  Join
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NearbyUsersOverlay;
