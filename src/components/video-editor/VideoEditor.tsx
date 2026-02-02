import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, Pause, Scissors, RotateCw, RotateCcw, 
  Volume2, VolumeX, Sun, Gauge, Check, X,
  FlipHorizontal, FlipVertical, Undo2
} from "lucide-react";
import { cn } from "@/lib/utils";
import TrimControls from "./TrimControls";
import SpeedControls from "./SpeedControls";
import RotateControls from "./RotateControls";
import FilterControls from "./FilterControls";
import VolumeControls from "./VolumeControls";

interface VideoEditorProps {
  videoBlob: Blob;
  maxDuration?: number;
  onComplete: (editedBlob: Blob, metadata: VideoEditMetadata) => void;
  onCancel: () => void;
}

export interface VideoEditMetadata {
  trimStart: number;
  trimEnd: number;
  speed: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  volume: number;
  muted: boolean;
}

type EditMode = "trim" | "speed" | "rotate" | "filter" | "volume";

const VideoEditor = ({ videoBlob, maxDuration, onComplete, onCancel }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeMode, setActiveMode] = useState<EditMode>("trim");

  // Edit states
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration === Infinity || isNaN(video.duration)) {
        video.currentTime = Number.MAX_SAFE_INTEGER;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          video.currentTime = 0;
          setDuration(video.duration);
          setTrimEnd(maxDuration ? Math.min(video.duration, maxDuration) : video.duration);
        };
      } else {
        setDuration(video.duration);
        setTrimEnd(maxDuration ? Math.min(video.duration, maxDuration) : video.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
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

  // Apply speed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Apply volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = muted ? 0 : volume / 100;
    }
  }, [volume, muted]);

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

  const handleSeek = (values: number[]) => {
    const [time] = values;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const resetAll = () => {
    setTrimStart(0);
    setTrimEnd(maxDuration ? Math.min(duration, maxDuration) : duration);
    setSpeed(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setVolume(100);
    setMuted(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleComplete = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      const metadata: VideoEditMetadata = {
        trimStart,
        trimEnd,
        speed,
        rotation,
        flipH,
        flipV,
        brightness,
        contrast,
        saturation,
        volume,
        muted,
      };

      // Pass original blob with metadata - actual processing would be server-side
      const editedBlob = new Blob([videoBlob], { type: videoBlob.type });
      onComplete(editedBlob, metadata);
      
    } catch (error) {
      console.error("Edit error:", error);
      onComplete(videoBlob, {
        trimStart: 0,
        trimEnd: duration,
        speed: 1,
        rotation: 0,
        flipH: false,
        flipV: false,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        volume: 100,
        muted: false,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [trimStart, trimEnd, speed, rotation, flipH, flipV, brightness, contrast, saturation, volume, muted, videoBlob, onComplete, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const trimmedDuration = trimEnd - trimStart;
  const isOverLimit = maxDuration ? trimmedDuration > maxDuration : false;

  // CSS filter string
  const videoFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  const videoTransform = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  const editModes: { id: EditMode; icon: React.ReactNode; label: string }[] = [
    { id: "trim", icon: <Scissors className="w-5 h-5" />, label: "Trim" },
    { id: "speed", icon: <Gauge className="w-5 h-5" />, label: "Speed" },
    { id: "rotate", icon: <RotateCw className="w-5 h-5" />, label: "Rotate" },
    { id: "filter", icon: <Sun className="w-5 h-5" />, label: "Adjust" },
    { id: "volume", icon: <Volume2 className="w-5 h-5" />, label: "Volume" },
  ];

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-yellow-500/30">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel} 
          className="gap-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
        <span className="text-sm font-semibold text-yellow-400">Edit Video</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={resetAll} 
          className="gap-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
        >
          <Undo2 className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {/* Video Preview */}
      <div className="flex-1 flex items-center justify-center bg-black min-h-0 overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center p-2">
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full object-contain rounded-lg"
            style={{ 
              filter: videoFilter,
              transform: videoTransform,
            }}
            playsInline
            onClick={togglePlay}
          />
          
          {/* Play button overlay */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Play className="w-8 h-8 text-black ml-1" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="px-4 py-3 bg-neutral-900 border-t border-yellow-500/20">
        <div className="flex items-center gap-2 text-xs text-yellow-400/70 mb-2">
          <span className="font-mono">{formatTime(currentTime)}</span>
          <div className="flex-1" />
          <span className="font-mono">{formatTime(duration)}</span>
        </div>
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full [&_[data-slot=track]]:bg-neutral-700 [&_[data-slot=range]]:bg-yellow-400 [&_[data-slot=thumb]]:bg-yellow-400 [&_[data-slot=thumb]]:border-yellow-500"
        />
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-6 py-3 bg-neutral-900">
        <Button
          variant="ghost"
          size="icon"
          className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = Math.max(0, currentTime - 5);
            }
          }}
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = Math.min(duration, currentTime + 5);
            }
          }}
        >
          <RotateCw className="w-5 h-5" />
        </Button>
      </div>

      {/* Edit Mode Controls */}
      <div className="bg-neutral-900 border-t border-yellow-500/20">
        {activeMode === "trim" && (
          <TrimControls
            duration={duration}
            trimStart={trimStart}
            trimEnd={trimEnd}
            maxDuration={maxDuration}
            onTrimChange={(start, end) => {
              setTrimStart(start);
              setTrimEnd(end);
              if (videoRef.current) {
                videoRef.current.currentTime = start;
              }
            }}
            formatTime={formatTime}
          />
        )}
        {activeMode === "speed" && (
          <SpeedControls speed={speed} onSpeedChange={setSpeed} />
        )}
        {activeMode === "rotate" && (
          <RotateControls
            rotation={rotation}
            flipH={flipH}
            flipV={flipV}
            onRotationChange={setRotation}
            onFlipHChange={setFlipH}
            onFlipVChange={setFlipV}
          />
        )}
        {activeMode === "filter" && (
          <FilterControls
            brightness={brightness}
            contrast={contrast}
            saturation={saturation}
            onBrightnessChange={setBrightness}
            onContrastChange={setContrast}
            onSaturationChange={setSaturation}
          />
        )}
        {activeMode === "volume" && (
          <VolumeControls
            volume={volume}
            muted={muted}
            onVolumeChange={setVolume}
            onMutedChange={setMuted}
          />
        )}
      </div>

      {/* Edit Mode Tabs */}
      <div className="flex bg-neutral-950 border-t border-yellow-500/30">
        {editModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors touch-manipulation",
              activeMode === mode.id
                ? "text-yellow-400 bg-yellow-500/15"
                : "text-neutral-500 hover:text-yellow-400/70 hover:bg-yellow-500/5"
            )}
          >
            {mode.icon}
            <span className="text-xs font-medium">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Save Button */}
      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-black border-t border-yellow-500/30">
        {isOverLimit && (
          <p className="text-xs text-red-400 text-center mb-2">
            Trim to {maxDuration}s or less to save
          </p>
        )}
        <Button
          onClick={handleComplete}
          disabled={isOverLimit || isProcessing}
          className="w-full h-12 text-base font-semibold gap-2 bg-yellow-400 hover:bg-yellow-300 text-black disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Save Changes ({formatTime(trimmedDuration)})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VideoEditor;
