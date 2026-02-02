import { useState, useEffect } from "react";
import { X, Users, User, MapPin } from "lucide-react";
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
  const [isClosing, setIsClosing] = useState(false);

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

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    onClose();
  };

  const onlineCount = participants.filter(p => p.isOnline).length;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Tap outside to close */}
      <div 
        className="absolute inset-0 pointer-events-auto" 
        onClick={handleClose}
      />
      
      {/* Floating card - centered */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-xs pointer-events-auto safe-area-mt">
        {/* Header pill */}
        <div className="bg-black/80 backdrop-blur-2xl border border-[#FFFF00]/30 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FFFF00]/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#FFFF00]" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{participants.length} Participants</p>
                <p className="text-white/50 text-xs">{onlineCount} online</p>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:bg-white/30 touch-manipulation"
              aria-label="Close participants"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
          
          {/* Participant list */}
          <div className="max-h-[50vh] overflow-auto">
            {participants.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-center px-4">
                <Users className="w-4 h-4 text-white/40 mr-2" />
                <span className="text-sm text-white/40">No participants yet</span>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-[#FFFF00]/10 border border-[#FFFF00]/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-[#FFFF00]" />
                      </div>
                      {/* Online indicator */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${
                        participant.isOnline ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">
                        {participant.username}
                        {participant.id === userId && (
                          <span className="ml-2 text-[10px] bg-[#FFFF00] text-black px-1.5 py-0.5 rounded-full font-bold">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-white/40">
                        {participant.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantLocationsOverlay;
