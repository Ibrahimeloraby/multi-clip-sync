import { useState, useRef, useEffect } from 'react';
import { Radio, Users, Loader2, X, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebRTC } from '@/hooks/useWebRTC';
import { cn } from '@/lib/utils';

interface LiveStreamViewProps {
  sessionId: string;
  userId: string;
  onClose: () => void;
}

const LiveStreamView = ({ sessionId, userId, onClose }: LiveStreamViewProps) => {
  const [isLive, setIsLive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { remoteStreams, isConnecting } = useWebRTC({
    sessionId,
    userId,
    localStream,
    enabled: isLive,
  });

  // Start local camera
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to get media stream:', error);
    }
  };

  // Stop local stream
  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  // Toggle live mode
  const toggleLive = async () => {
    if (isLive) {
      setIsLive(false);
      stopLocalStream();
    } else {
      await startLocalStream();
      setIsLive(true);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLocalStream();
  }, []);

  const remoteStreamArray = Array.from(remoteStreams.entries());
  const totalParticipants = remoteStreamArray.length + (isLive ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-pt">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {isLive && (
              <div className="flex items-center gap-2 bg-destructive text-white px-3 py-1.5 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm">
              <Users className="w-4 h-4" />
              {totalParticipants}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 flex items-center justify-center p-4">
        {!isLive ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto">
              <Radio className="w-10 h-10 text-white/60" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Go Live</h2>
              <p className="text-white/60 text-sm max-w-xs">
                Start streaming your camera to all session participants in real-time
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(
            "w-full h-full grid gap-2",
            totalParticipants === 1 && "grid-cols-1",
            totalParticipants === 2 && "grid-cols-2",
            totalParticipants >= 3 && totalParticipants <= 4 && "grid-cols-2 grid-rows-2",
            totalParticipants > 4 && "grid-cols-3 grid-rows-2"
          )}>
            {/* Local video */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                You
              </div>
              {!videoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-white/50" />
                </div>
              )}
            </div>

            {/* Remote videos */}
            {remoteStreamArray.map(([peerId, stream]) => (
              <RemoteVideo key={peerId} peerId={peerId} stream={stream} />
            ))}

            {/* Connecting indicator */}
            {isConnecting && remoteStreamArray.length === 0 && (
              <div className="bg-gray-900 rounded-xl flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-white/50 mx-auto" />
                  <p className="text-xs text-white/50">Waiting for others...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="safe-area-pb">
        <div className="flex items-center justify-center gap-4 py-6">
          {isLive && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAudio}
                className={cn(
                  "w-14 h-14 rounded-full",
                  audioEnabled ? "bg-white/20 text-white" : "bg-destructive text-white"
                )}
              >
                {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVideo}
                className={cn(
                  "w-14 h-14 rounded-full",
                  videoEnabled ? "bg-white/20 text-white" : "bg-destructive text-white"
                )}
              >
                {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>
            </>
          )}

          <Button
            onClick={toggleLive}
            className={cn(
              "w-20 h-20 rounded-full transition-all",
              isLive
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-[#FFFF00]/80 hover:bg-[#FFFF00] text-black"
            )}
          >
            <Radio className="w-8 h-8" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Remote video component
const RemoteVideo = ({ peerId, stream }: { peerId: string; stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
        Peer
      </div>
    </div>
  );
};

export default LiveStreamView;
