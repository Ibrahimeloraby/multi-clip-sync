import { useState, useEffect } from 'react';
import { X, MapPin, Users, Radio, Loader2, Globe, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Participant {
  user_id: string;
  username: string;
}

interface NearbySession {
  id: string;
  name: string;
  time_code: string;
  distance: number;
  is_live: boolean;
}

interface SessionDiscoveryViewProps {
  sessionId?: string;
  userId: string;
  onClose: () => void;
  onJoinSession?: (sessionId: string, timeCode: string, sessionName: string) => void;
}

const SessionDiscoveryView = ({ sessionId, userId, onClose, onJoinSession }: SessionDiscoveryViewProps) => {
  const [activeTab, setActiveTab] = useState<'participants' | 'nearby'>(sessionId ? 'participants' : 'nearby');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [nearbySessions, setNearbySessions] = useState<NearbySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (activeTab === 'participants' && sessionId) {
      fetchParticipants();
    } else if (activeTab === 'nearby') {
      getCurrentLocationAndFetchNearby();
    }
  }, [activeTab, sessionId]);

  // Subscribe to participant changes in real-time
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchParticipants = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const { data } = await supabase
        .from('session_participants')
        .select('user_id, profiles(username)')
        .eq('session_id', sessionId);

      if (data) {
        const mapped = data.map((p: any) => ({
          user_id: p.user_id,
          username: p.profiles?.username || 'Unknown User',
        }));
        setParticipants(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocationAndFetchNearby = async () => {
    setLoading(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        await fetchNearbySessions(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Could not get your location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchNearbySessions = async (lat: number, lng: number) => {
    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name, time_code, latitude, longitude, is_live, is_active')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (sessions) {
        // Calculate distance using Haversine formula
        const withDistance = sessions
          .filter(s => s.id !== sessionId) // Exclude current session
          .map(s => ({
            id: s.id,
            name: s.name,
            time_code: s.time_code,
            is_live: s.is_live,
            distance: calculateDistance(lat, lng, s.latitude!, s.longitude!),
          }))
          .filter(s => s.distance <= 10) // Within 10km
          .sort((a, b) => a.distance - b.distance);

        setNearbySessions(withDistance);
      }
    } catch (error) {
      console.error('Failed to fetch nearby sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
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
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${km.toFixed(1)}km away`;
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="safe-area-pt border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold">Discover</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-2 gap-2">
          {sessionId && (
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'participants'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1.5" />
              My Session
            </button>
          )}
          <button
            onClick={() => setActiveTab('nearby')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'nearby'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-1.5" />
            Nearby
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === 'participants' ? (
          <div className="space-y-3">
            {participants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="font-medium mb-1">No participants yet</h3>
                <p className="text-sm text-muted-foreground">
                  Share your session code to invite others
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''} in this session
                </p>
                {participants.map((participant) => (
                  <div
                    key={participant.user_id}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {participant.username}
                        {participant.user_id === userId && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {nearbySessions.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="font-medium mb-1">No sessions nearby</h3>
                <p className="text-sm text-muted-foreground">
                  No active sessions within 10km of your location
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {nearbySessions.length} session{nearbySessions.length !== 1 ? 's' : ''} nearby
                </p>
                {nearbySessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onJoinSession?.(session.id, session.time_code, session.name)}
                    className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {session.is_live ? (
                        <Radio className="w-5 h-5 text-destructive" />
                      ) : (
                        <MapPin className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{session.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistance(session.distance)}
                      </p>
                    </div>
                    {session.is_live && (
                      <div className="flex items-center gap-1 text-destructive text-xs font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        LIVE
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDiscoveryView;
