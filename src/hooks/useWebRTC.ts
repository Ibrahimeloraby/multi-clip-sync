import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface UseWebRTCProps {
  sessionId: string;
  userId: string;
  localStream: MediaStream | null;
  enabled: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = ({ sessionId, userId, localStream, enabled }: UseWebRTCProps) => {
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Create peer connection for a remote user
  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
    console.log(`Creating peer connection for ${peerId}, initiator: ${isInitiator}`);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`Received track from ${peerId}`);
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream));
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await sendSignal(peerId, 'ice-candidate', { candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state for ${peerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        removePeer(peerId);
      }
    };

    const peerConnection: PeerConnection = { peerId, connection: pc };
    peersRef.current.set(peerId, peerConnection);
    setPeers(new Map(peersRef.current));

    return pc;
  }, [localStream]);

  // Send signaling message
  const sendSignal = async (toUserId: string, signalType: string, signalData: any) => {
    try {
      await supabase.from('webrtc_signals').insert({
        session_id: sessionId,
        from_user_id: userId,
        to_user_id: toUserId,
        signal_type: signalType,
        signal_data: signalData,
      });
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  };

  // Handle incoming signal
  const handleSignal = async (signal: any) => {
    const { from_user_id, signal_type, signal_data } = signal;
    
    if (from_user_id === userId) return;

    console.log(`Received ${signal_type} from ${from_user_id}`);

    let pc = peersRef.current.get(from_user_id)?.connection;

    if (signal_type === 'offer') {
      // Someone is initiating a connection to us
      pc = createPeerConnection(from_user_id, false);
      
      await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(from_user_id, 'answer', answer);
      
    } else if (signal_type === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
      }
      
    } else if (signal_type === 'ice-candidate') {
      if (pc && signal_data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal_data.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    }
  };

  // Remove a peer connection
  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
    }
  }, []);

  // Initiate connection to a peer
  const connectToPeer = async (peerId: string) => {
    if (peerId === userId) return;
    if (peersRef.current.has(peerId)) return;

    console.log(`Initiating connection to ${peerId}`);
    const pc = createPeerConnection(peerId, true);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(peerId, 'offer', offer);
    } catch (error) {
      console.error('Error creating offer:', error);
      removePeer(peerId);
    }
  };

  // Subscribe to presence and signals
  useEffect(() => {
    if (!enabled || !sessionId || !userId) return;

    setIsConnecting(true);

    // Subscribe to signaling channel
    const signalChannel = supabase
      .channel(`signals-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => handleSignal(payload.new)
      )
      .subscribe();

    // Subscribe to presence for peer discovery
    const presenceChannel = supabase.channel(`live-${sessionId}`, {
      config: { presence: { key: userId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('Presence state:', state);
        
        // Connect to all other live users
        Object.keys(state).forEach((peerId) => {
          if (peerId !== userId && !peersRef.current.has(peerId)) {
            connectToPeer(peerId);
          }
        });
        setIsConnecting(false);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('User joined:', key);
        if (key !== userId) {
          connectToPeer(key);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('User left:', key);
        removePeer(key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = presenceChannel;

    return () => {
      // Cleanup
      signalChannel.unsubscribe();
      presenceChannel.unsubscribe();
      
      // Close all peer connections
      peersRef.current.forEach((peer) => peer.connection.close());
      peersRef.current.clear();
      setPeers(new Map());
      setRemoteStreams(new Map());
    };
  }, [enabled, sessionId, userId, createPeerConnection, removePeer]);

  // Update tracks when local stream changes
  useEffect(() => {
    if (!localStream) return;

    peersRef.current.forEach((peer) => {
      const senders = peer.connection.getSenders();
      localStream.getTracks().forEach((track) => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          peer.connection.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  return {
    remoteStreams,
    peers: Array.from(peers.values()),
    isConnecting,
    connectToPeer,
    removePeer,
  };
};
