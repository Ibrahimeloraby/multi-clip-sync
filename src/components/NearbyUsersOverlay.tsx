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
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Tap outside to close */}
      <div 
        className="absolute inset-0 pointer-events-auto" 
        onClick={handleClose}
      />
      
      {/* Floating card - bottom left, compact */}
      <div className="absolute bottom-24 left-4 right-16 pointer-events-auto">
        <div className="bg-black/80 backdrop-blur-xl border border-[#FFFF00]/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#FFFF00]/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#FFFF00] flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-white font-semibold text-sm">Nearby</span>
            </div>
            
            <button
              onClick={handleClose}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-32 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#FFFF00]" />
                <span className="text-white/50 text-xs">Scanning...</span>
              </div>
            ) : nearbySessions.length === 0 ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <MapPin className="w-4 h-4 text-[#FFFF00]/50" />
                <span className="text-white/50 text-xs">No sessions nearby</span>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {nearbySessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      onJoinSession?.(session.id, session.time_code, session.name);
                      handleClose();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-[#FFFF00]/5 hover:bg-[#FFFF00]/15 active:scale-[0.98] transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#FFFF00]/20 border border-[#FFFF00]/30 flex items-center justify-center shrink-0">
                      {session.is_live ? (
                        <Radio className="w-4 h-4 text-red-400" />
                      ) : (
                        <User className="w-4 h-4 text-[#FFFF00]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-xs truncate">{session.name}</p>
                      <p className="text-[10px] text-white/40">
                        {session.participant_count} • {formatDistance(session.distance)}
                      </p>
                    </div>
                    <span className="text-[#FFFF00] text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                      Join →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NearbyUsersOverlay;
