import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Loader2, Upload, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CameraControls from "@/components/CameraControls";
import VideoTrimmer from "@/components/VideoTrimmer";
import { CreateSessionModal } from "@/components/SessionModals";
import QuickShare from "@/components/QuickShare";

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
  
  // Session state - unified: once created, session is ready to share & record
  const [currentSession, setCurrentSession] = useState<{ id: string; name: string; timeCode: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  

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
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Camera not supported on this browser");
        console.error("mediaDevices not available");
        return;
      }
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      console.log("Requesting camera access...");
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      console.log("Camera access granted, setting up video element...");
      
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        
        await videoRef.current.play();
        console.log("Video playing successfully");
      }

      setCameraReady(true);
    } catch (error: any) {
      console.error("Camera error:", error.name, error.message);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error("Camera access denied. Check your browser settings.");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error("No camera found on this device.");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error("Camera is in use by another app.");
      } else if (error.name === 'OverconstrainedError') {
        // Try again with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setStream(basicStream);
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            await videoRef.current.play();
          }
          setCameraReady(true);
          return;
        } catch {
          toast.error("Camera not compatible.");
        }
      } else {
        toast.error(`Camera error: ${error.message || 'Unknown error'}`);
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

  const handleSessionCreated = (sessionId: string, timeCode: string, sessionName: string = "New Session") => {
    // Session is immediately active and shareable
    setCurrentSession({ id: sessionId, name: sessionName, timeCode });
    toast.success("Session created! Share with friends or start recording.");
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

        {/* Loading overlay - with retry option after delay */}
        {!cameraReady && !showTrimmer && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white/70 text-sm">Starting camera...</p>
            <button
              onClick={() => startCamera()}
              className="mt-4 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tap to retry
            </button>
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
          <div className="flex items-center justify-center gap-8 py-6 px-4">
            {/* Record button */}
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={!cameraReady}
              className="relative active:scale-95 transition-transform"
            >
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                {recording ? (
                  <div className="w-8 h-8 rounded-md bg-destructive" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-destructive" />
                )}
              </div>
            </button>

            {/* Share/Create button */}
            {currentSession ? (
              <QuickShare 
                timeCode={currentSession.timeCode}
                sessionName={currentSession.name}
              />
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-all active:scale-95"
                disabled={recording}
              >
                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium">New</span>
              </button>
            )}
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


      {/* Modals */}
      <CreateSessionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
};

export default CameraScreen;
