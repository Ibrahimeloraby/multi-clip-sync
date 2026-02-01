import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Video, Users, Share2, Plus, Loader2, Upload
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CameraControls from "@/components/CameraControls";
import VideoTrimmer from "@/components/VideoTrimmer";
import BottomNav from "@/components/BottomNav";
import { CreateSessionModal, JoinSessionModal, ShareSessionModal } from "@/components/SessionModals";

const CameraScreen = () => {
  const navigate = useNavigate();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  // Session state
  const [currentSession, setCurrentSession] = useState<{ id: string; name: string; timeCode: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxDuration = 30; // Default max duration

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  // Recording timer
  useEffect(() => {
    if (recording) {
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [recording]);

  const startCamera = async () => {
    try {
      setCameraReady(false);
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch (error: any) {
      console.error("Camera error:", error);
      if (error.name === 'NotAllowedError') {
        toast.error("Camera access denied. Please allow camera permissions.");
      } else {
        toast.error("Failed to access camera");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const handleFacingModeChange = (mode: "user" | "environment") => {
    setFacingMode(mode);
  };

  const startRecording = async () => {
    if (!stream) {
      toast.error("Camera not ready");
      return;
    }

    if (!currentSession) {
      toast.error("Create or join a session first");
      setShowCreateModal(true);
      return;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 1000) {
          setRecordedBlob(blob);
          setShowTrimmer(true);
        } else {
          toast.error("Recording too short");
        }
      };

      mediaRecorder.start(1000);
      setRecording(true);
      toast.success("Recording started!");

      // Auto-stop after max duration
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
          toast.info(`Maximum ${maxDuration}s reached`);
        }
      }, maxDuration * 1000);
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleTrimComplete = async (trimmedBlob: Blob) => {
    setShowTrimmer(false);
    setRecordedBlob(null);
    await uploadVideo(trimmedBlob);
  };

  const handleTrimCancel = () => {
    setShowTrimmer(false);
    setRecordedBlob(null);
    toast.info("Recording discarded");
  };

  const uploadVideo = async (blob: Blob) => {
    if (!currentSession) return;
    
    setUploading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', authSession.user.id)
        .single();

      // Get video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      const duration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => {
          if (video.duration === Infinity || isNaN(video.duration)) {
            video.currentTime = Number.MAX_SAFE_INTEGER;
            video.ontimeupdate = () => {
              video.ontimeupdate = null;
              resolve(Math.max(1, Math.floor(video.duration)));
            };
          } else {
            resolve(Math.max(1, Math.floor(video.duration)));
          }
        };
        video.onerror = () => resolve(5);
        video.src = URL.createObjectURL(blob);
      });

      const filePath = `${authSession.user.id}/${currentSession.id}/${Date.now()}-recording.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      await supabase.from('videos').insert({
        session_id: currentSession.id,
        user_id: authSession.user.id,
        device_id: profile?.device_id || 'unknown',
        storage_path: filePath,
        thumbnail_url: publicUrl,
        duration: duration,
      });

      toast.success("Video uploaded!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file");
        return;
      }
      if (!currentSession) {
        toast.error("Create or join a session first");
        setShowCreateModal(true);
        return;
      }
      setRecordedBlob(file);
      setShowTrimmer(true);
    }
  };

  const handleSessionCreated = (sessionId: string, timeCode: string) => {
    setCurrentSession({ id: sessionId, name: "New Session", timeCode });
    toast.success("Session ready! Start recording.");
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera Preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {/* Loading overlay */}
        {!cameraReady && !showTrimmer && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Recording indicator */}
        {recording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive text-white px-3 py-1.5 rounded-full text-sm font-medium safe-area-mt">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
          </div>
        )}

        {/* Session indicator */}
        {currentSession && !recording && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium safe-area-mt">
            📹 {currentSession.name}
          </div>
        )}

        {/* Time remaining */}
        {recording && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm safe-area-mt">
            {maxDuration - recordingTime}s
          </div>
        )}

        {/* Camera controls (right side) */}
        {cameraReady && !recording && !showTrimmer && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            <CameraControls
              stream={stream}
              facingMode={facingMode}
              onFacingModeChange={handleFacingModeChange}
            />
          </div>
        )}

        {/* Trimmer overlay */}
        {showTrimmer && recordedBlob && (
          <div className="absolute inset-0 bg-background/95 p-4 overflow-auto">
            <h3 className="text-lg font-semibold mb-4 text-center">Trim Your Video</h3>
            <VideoTrimmer
              videoBlob={recordedBlob}
              maxDuration={maxDuration}
              onTrimComplete={handleTrimComplete}
              onCancel={handleTrimCancel}
            />
          </div>
        )}

        {/* Upload indicator */}
        {uploading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
              <p>Uploading...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {!showTrimmer && !uploading && (
        <div className="bg-black/90 backdrop-blur-lg safe-area-pb">
          <div className="flex items-center justify-around py-4 px-4 max-w-lg mx-auto">
            {/* Join button */}
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
              disabled={recording}
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px]">Join</span>
            </button>

            {/* Record button */}
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={!cameraReady}
              className="relative"
            >
              <div className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${
                recording ? 'bg-transparent' : 'bg-transparent'
              }`}>
                {recording ? (
                  <div className="w-8 h-8 rounded-sm bg-destructive" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-destructive" />
                )}
              </div>
            </button>

            {/* Create/Share button */}
            {currentSession ? (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                disabled={recording}
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-[10px]">Share</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                disabled={recording}
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px]">Create</span>
              </button>
            )}
          </div>

          {/* Upload from gallery */}
          <div className="flex justify-center pb-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-white/60 text-xs flex items-center gap-1 hover:text-white transition-colors"
              disabled={recording}
            >
              <Upload className="w-3 h-3" />
              Upload from gallery
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Bottom Navigation - hidden when recording */}
      {!recording && !showTrimmer && !uploading && <BottomNav />}

      {/* Modals */}
      <CreateSessionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSessionCreated={handleSessionCreated}
      />
      <JoinSessionModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
      />
      {currentSession && (
        <ShareSessionModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          timeCode={currentSession.timeCode}
          sessionName={currentSession.name}
        />
      )}
    </div>
  );
};

export default CameraScreen;
