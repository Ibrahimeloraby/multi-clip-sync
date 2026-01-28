import { Upload, Video as VideoIcon, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoUploadProps {
  sessionId: string;
  userId: string;
  deviceId: string;
  maxDuration: number;
  onUploadComplete: () => void;
  autoStart?: boolean;
  onAutoStartComplete?: () => void;
}

const VideoUpload = ({ sessionId, userId, deviceId, maxDuration, onUploadComplete, autoStart, onAutoStartComplete }: VideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'uploading' | 'success' | 'error'>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment'); // Default to back camera
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const uploadFile = useCallback(async (file: Blob, fileName: string) => {
    try {
      setUploading(true);
      setUploadStatus('processing');
      setProgress(10);
      
      console.log("Starting upload process, blob size:", file.size);

      // Create video element to get duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const duration = await Promise.race([
        new Promise<number>((resolve, reject) => {
          video.onloadedmetadata = () => {
            // Handle Infinity duration for webm (Chrome issue)
            if (video.duration === Infinity || isNaN(video.duration)) {
              video.currentTime = Number.MAX_SAFE_INTEGER;
              video.ontimeupdate = () => {
                video.ontimeupdate = null;
                video.currentTime = 0;
                resolve(Math.max(1, Math.floor(video.duration)));
              };
            } else {
              resolve(Math.max(1, Math.floor(video.duration)));
            }
          };
          video.onerror = () => reject(new Error("Failed to load video"));
          video.src = URL.createObjectURL(file);
        }),
        // Timeout fallback - estimate 1 second per 100KB
        new Promise<number>((resolve) => {
          setTimeout(() => {
            const estimatedDuration = Math.max(1, Math.ceil(file.size / 100000));
            resolve(Math.min(estimatedDuration, maxDuration));
          }, 3000);
        })
      ]);

      setProgress(30);

      if (duration > maxDuration) {
        toast.error(`Video too long! Maximum ${maxDuration} seconds allowed.`);
        setUploading(false);
        return;
      }

      // Get user location if available
      let latitude = null;
      let longitude = null;
      
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }
      } catch {
        // Location not available, continue without it
      }

      setProgress(50);
      setUploadStatus('uploading');

      // Upload to storage
      const filePath = `${userId}/${sessionId}/${Date.now()}-${fileName}`;
      
      console.log("Uploading video to storage:", filePath, "size:", file.size);
      toast.info("Uploading video...");
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }
      
      setProgress(80);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      console.log("Creating video record in database");

      // Create video record in database
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          session_id: sessionId,
          user_id: userId,
          device_id: deviceId,
          storage_path: filePath,
          thumbnail_url: publicUrl,
          duration: duration,
          latitude,
          longitude
        });

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw dbError;
      }

      setProgress(100);
      setUploadStatus('success');
      toast.success("Video uploaded successfully!");
      onUploadComplete();

    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus('error');
      toast.error(error.message || "Failed to upload video. Please try again.");
    } finally {
      setUploading(false);
      setTimeout(() => {
        setProgress(0);
        setUploadStatus('idle');
      }, 2000);
    }
  }, [sessionId, userId, deviceId, maxDuration, onUploadComplete]);

  // Auto-upload when pendingBlob is set
  useEffect(() => {
    if (pendingBlob && !uploading) {
      console.log("Pending blob detected, starting upload... size:", pendingBlob.size);
      if (pendingBlob.size < 1000) {
        console.warn("Blob too small, likely empty recording");
        toast.error("Recording was too short or empty. Please try again.");
        setPendingBlob(null);
        return;
      }
      toast.info("Processing recording...");
      uploadFile(pendingBlob, `recording-${Date.now()}.webm`);
      setPendingBlob(null);
    }
  }, [pendingBlob, uploading, uploadFile]);
  
  // Recording timer
  useEffect(() => {
    if (recording) {
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [recording]);

  // Auto-start recording when autoStart prop is true
  const autoStartTriggered = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStartTriggered.current && !recording && !uploading) {
      autoStartTriggered.current = true;
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        startRecording();
        onAutoStartComplete?.();
      }, 500);
    }
  }, [autoStart, recording, uploading]);

  const startRecording = async () => {
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }, 
        audio: true 
      });

      streamRef.current = stream;

      // Set recording state first so the video element renders
      setRecording(true);

      // Wait for next tick to ensure video element is in DOM
      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Force play with error handling
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn("Auto-play failed, user interaction may be needed:", playError);
        }
      }

      // Check supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
        ? 'video/webm;codecs=vp8,opus' 
        : MediaRecorder.isTypeSupported('video/webm') 
          ? 'video/webm' 
          : 'video/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, creating blob from chunks:", chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log("Blob created, size:", blob.size);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        // Set pending blob to trigger upload via useEffect
        setPendingBlob(blob);
      };

      // Start recording with timeslice for better compatibility
      mediaRecorder.start(1000);
      toast.success("Recording started!");

      // Auto-stop after max duration
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
          toast.info(`Maximum duration of ${maxDuration}s reached`);
        }
      }, maxDuration * 1000);

    } catch (error: any) {
      console.error("Error starting recording:", error);
      setRecording(false);
      if (error.name === 'NotAllowedError') {
        toast.error("Camera access denied. Please allow camera permissions in your browser settings.");
      } else if (error.name === 'NotFoundError') {
        toast.error("No camera found. Please connect a camera and try again.");
      } else {
        toast.error("Failed to access camera/microphone. Please check your permissions.");
      }
    }
  };

  const stopRecording = () => {
    console.log("Stop recording called, state:", mediaRecorderRef.current?.state);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file");
        return;
      }
      uploadFile(file, file.name);
    }
  };

  return (
    <Card className="glass-card p-6 space-y-4">
      <h2 className="text-xl font-semibold">Record or Upload Video</h2>
      
      {recording && (
        <div className="space-y-4">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video bg-black rounded-lg object-cover"
              style={{ minHeight: '200px', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {/* Recording indicator with timer */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </div>
            {/* Time remaining */}
            <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {maxDuration - recordingTime}s left
            </div>
          </div>
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="w-full py-6 text-lg"
          >
            ⏹ Stop & Save Recording
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Press stop to save your video. Don't close or navigate away!
          </p>
        </div>
      )}

      {!recording && !uploading && (
        <div className="space-y-4">
          {/* Camera toggle */}
          <div className="flex items-center justify-center gap-2">
            <span className={`text-sm ${facingMode === 'user' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Front</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
              className="px-3"
            >
              <SwitchCamera className="w-4 h-4" />
            </Button>
            <span className={`text-sm ${facingMode === 'environment' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Back</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={startRecording}
              variant="secondary"
              className="flex flex-col items-center py-8"
            >
              <VideoIcon className="w-8 h-8 mb-2" />
              <span>Record Video</span>
              <span className="text-xs text-muted-foreground mt-1">Max {maxDuration}s</span>
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              className="flex flex-col items-center py-8"
            >
              <Upload className="w-8 h-8 mb-2" />
              <span>Upload Video</span>
              <span className="text-xs text-muted-foreground mt-1">From device</span>
            </Button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="space-y-3">
          <Progress value={progress} className="w-full" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {uploadStatus === 'processing' && '📹 Processing video...'}
              {uploadStatus === 'uploading' && '☁️ Uploading to cloud...'}
              {uploadStatus === 'success' && '✅ Upload complete!'}
              {uploadStatus === 'error' && '❌ Upload failed'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% - Please don't close this page
            </p>
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
    </Card>
  );
};

export default VideoUpload;
