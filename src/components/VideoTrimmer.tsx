import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Scissors, RotateCcw, Check, X } from "lucide-react";

interface VideoTrimmerProps {
  videoBlob: Blob;
  maxDuration: number;
  onTrimComplete: (trimmedBlob: Blob) => void;
  onCancel: () => void;
}

const VideoTrimmer = ({ videoBlob, maxDuration, onTrimComplete, onCancel }: VideoTrimmerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isTrimming, setIsTrimming] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      // Handle Infinity duration bug
      if (video.duration === Infinity || isNaN(video.duration)) {
        video.currentTime = Number.MAX_SAFE_INTEGER;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          video.currentTime = 0;
          setDuration(video.duration);
          setTrimEnd(Math.min(video.duration, maxDuration));
        };
      } else {
        setDuration(video.duration);
        setTrimEnd(Math.min(video.duration, maxDuration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Stop at trim end
      if (video.currentTime >= trimEnd) {
        video.pause();
        setIsPlaying(false);
        video.currentTime = trimStart;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [trimStart, trimEnd, maxDuration]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrimChange = (values: number[]) => {
    const [start, end] = values;
    setTrimStart(start);
    setTrimEnd(Math.min(end, start + maxDuration));
    
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
  };

  const resetTrim = () => {
    setTrimStart(0);
    setTrimEnd(Math.min(duration, maxDuration));
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleTrimComplete = useCallback(async () => {
    setIsTrimming(true);
    
    try {
      // For browser-based trimming, we'll use a simple approach
      // For production, you'd want to use FFmpeg.wasm or server-side processing
      
      // If no trimming needed, just use original blob
      if (trimStart === 0 && trimEnd >= duration) {
        onTrimComplete(videoBlob);
        return;
      }

      // Create a MediaSource approach for trimming
      // Note: Full client-side video trimming requires FFmpeg.wasm
      // For now, we'll pass the trim metadata and handle in upload
      
      // Simple approach: Just pass the original blob with trim markers
      // The actual trimming would be done server-side in production
      const trimmedBlob = new Blob([videoBlob], { type: videoBlob.type });
      
      // Store trim info in blob metadata (we'll handle this during upload)
      (trimmedBlob as any).trimStart = trimStart;
      (trimmedBlob as any).trimEnd = trimEnd;
      
      onTrimComplete(trimmedBlob);
      
    } catch (error) {
      console.error("Trim error:", error);
      // Fallback to original
      onTrimComplete(videoBlob);
    } finally {
      setIsTrimming(false);
    }
  }, [trimStart, trimEnd, duration, videoBlob, onTrimComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const trimmedDuration = trimEnd - trimStart;
  const isOverLimit = trimmedDuration > maxDuration;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          Trim Video
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Video Preview */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video object-contain"
          playsInline
          muted
        />
        
        {/* Play button overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-12 h-12 text-white" />
          ) : (
            <Play className="w-12 h-12 text-white" />
          )}
        </button>

        {/* Current time indicator */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-mono">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Trim Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Start: {formatTime(trimStart)}</span>
          <span className={isOverLimit ? 'text-destructive font-medium' : ''}>
            Duration: {formatTime(trimmedDuration)} / {maxDuration}s max
          </span>
          <span>End: {formatTime(trimEnd)}</span>
        </div>
        
        <Slider
          value={[trimStart, trimEnd]}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={handleTrimChange}
          className="w-full"
        />
        
        {isOverLimit && (
          <p className="text-xs text-destructive">
            Trim the video to {maxDuration} seconds or less
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={resetTrim} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleTrimComplete}
          disabled={isOverLimit || isTrimming}
          className="flex-1 gradient-primary gap-2"
        >
          {isTrimming ? (
            <>Processing...</>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Use This Clip ({formatTime(trimmedDuration)})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VideoTrimmer;
