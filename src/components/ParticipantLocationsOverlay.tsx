import { useState, useEffect } from "react";
import { X, Users, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ParticipantLocationsOverlayProps {
  sessionId: string;
  userId: string;
  onClose: () => void;
}

interface Participant {
  id: string;
  username: string;
  isOnline: boolean;
}

const ParticipantLocationsOverlay = ({ sessionId, userId, onClose }: ParticipantLocationsOverlayProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Fetch participants
  useEffect(() => {
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("session_participants")
        .select("user_id, profiles(username)")
        .eq("session_id", sessionId);

      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.user_id,
          username: p.profiles?.username || "Unknown",
          isOnline: onlineUsers.has(p.user_id),
        }));
        setParticipants(mapped);
      }
    };

    fetchParticipants();

    // Subscribe to participant changes
    const channel = supabase
      .channel(`participants-locations-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        () => fetchParticipants()
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [sessionId, onlineUsers]);

  // Track presence
  useEffect(() => {
    const presenceChannel = supabase.channel(`presence-${sessionId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) online.add(p.user_id);
          });
        });
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [sessionId, userId]);

  // Update participant online status when onlineUsers changes
  useEffect(() => {
    setParticipants(prev => prev.map(p => ({
      ...p,
      isOnline: onlineUsers.has(p.id),
    })));
  }, [onlineUsers]);

  const onlineCount = participants.filter(p => p.isOnline).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Main view - with background */}
      <div className="flex-1 relative bg-black/90">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between safe-area-mt">
          <div className="flex items-center gap-2 bg-library-accent text-black px-3 py-1.5 rounded-full text-xs font-bold">
            <Users className="w-4 h-4" />
            {participants.length} in session
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full bg-black/60 backdrop-blur-sm text-library-accent hover:bg-black/80"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Centered content */}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-library-accent/20 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-library-accent" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Session Participants</h2>
              <p className="text-sm text-white/60">{onlineCount} online now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel - Participant list */}
      <div className="bg-library-surface border-t border-library-border safe-area-pb max-h-[40vh] overflow-auto">
        <div className="px-4 py-3 space-y-2">
          {participants.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-center">
              <Users className="w-5 h-5 text-library-text-muted mr-2" />
              <span className="text-sm text-library-text-muted">No participants yet</span>
            </div>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-3 bg-black/40 rounded-xl"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-library-accent/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-library-accent" />
                  </div>
                  {/* Online indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-library-surface ${
                    participant.isOnline ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {participant.username}
                    {participant.id === userId && (
                      <span className="ml-2 text-[10px] bg-library-accent text-black px-1.5 py-0.5 rounded-full">
                        YOU
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-white/50">
                    {participant.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantLocationsOverlay;
