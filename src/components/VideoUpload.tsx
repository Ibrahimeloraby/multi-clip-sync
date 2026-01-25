import { Upload, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoUploadProps {
  sessionId: string;
  userId: string;
  deviceId: string;
  maxDuration: number;
  onUploadComplete: () => void;
}

const VideoUpload = ({ sessionId, userId, deviceId, maxDuration, onUploadComplete }: VideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startRecording = async () => {
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        await videoRef.current.play().catch(console.error);
      }

      // Check supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
        ? 'video/webm;codecs=vp8,opus' 
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setRecording(true);
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
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadFile = async (file: Blob, fileName: string) => {
    try {
      setUploading(true);
      setProgress(0);

      // Create video element to get duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const duration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => {
          resolve(Math.floor(video.duration));
        };
        video.src = URL.createObjectURL(file);
      });

      setVideoDuration(duration);

      if (duration > maxDuration) {
        toast.error(`Video too long! Maximum ${maxDuration} seconds allowed.`);
        setUploading(false);
        return;
      }

      // Get user location if available
      let latitude = null;
      let longitude = null;
      
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        }).catch(() => null);
        
        if (position) {
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }
      }

      // Upload to storage
      const filePath = `${userId}/${sessionId}/${Date.now()}-${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      
      setProgress(100);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

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

      if (dbError) throw dbError;

      toast.success("Video uploaded successfully!");
      setRecordedBlob(null);
      onUploadComplete();

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload video");
    } finally {
      setUploading(false);
      setProgress(0);
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

  const handleRecordedUpload = () => {
    if (recordedBlob) {
      uploadFile(recordedBlob, `recording-${Date.now()}.webm`);
    }
  };

  return (
    <Card className="glass-card p-6 space-y-4">
      <h2 className="text-xl font-semibold">Record or Upload Video</h2>
      
      {recording && (
        <div className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full aspect-video bg-muted rounded-lg"
          />
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="w-full"
          >
            Stop Recording
          </Button>
        </div>
      )}

      {recordedBlob && !uploading && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Recording complete! Ready to upload.</p>
          <div className="flex gap-2">
            <Button
              onClick={handleRecordedUpload}
              className="flex-1 gradient-primary"
            >
              Upload Recording
            </Button>
            <Button
              onClick={() => setRecordedBlob(null)}
              variant="secondary"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {!recording && !recordedBlob && !uploading && (
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
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">
            Uploading... {Math.round(progress)}%
          </p>
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
