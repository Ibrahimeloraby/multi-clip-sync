import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Maximize2,
  Grid3X3,
  LayoutGrid
} from "lucide-react";

interface VideoItem {
  id: string;
  user_id: string;
  device_id: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  uploaded_at: string;
  profiles: {
    id: string;
    username: string;
    device_id: string;
    avatar_url?: string;
  };
}

interface MultiAnglePlayerProps {
  videos: VideoItem[];
  onClose?: () => void;
}

type LayoutMode = 'grid' | 'focus';

const MultiAnglePlayer = ({ videos, onClose }: MultiAnglePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [focusedVideoIndex, setFocusedVideoIndex] = useState(0);
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const isSeekingRef = useRef(false);

  // Calculate max duration from all videos
  useEffect(() => {
    const maxDuration = Math.max(...videos.map(v => v.duration), 0);
    setDuration(maxDuration);
  }, [videos]);

  // Sync all videos to the same time
  const syncVideos = useCallback((time: number) => {
    videoRefs.current.forEach((video) => {
      if (video && Math.abs(video.currentTime - time) > 0.1) {
        video.currentTime = time;
      }
    });
  }, []);

  // Handle time update from main video
  const handleTimeUpdate = useCallback(() => {
    if (isSeekingRef.current) return;
    
    const mainVideo = videoRefs.current[0];
    if (mainVideo) {
      setCurrentTime(mainVideo.currentTime);
    }
  }, []);

  // Play all videos
  const playAll = useCallback(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.play().catch(console.error);
      }
    });
    setIsPlaying(true);
  }, []);

  // Pause all videos
  const pauseAll = useCallback(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.pause();
      }
    });
    setIsPlaying(false);
  }, []);

  // Toggle play/pause
  const togglePlay = () => {
    if (isPlaying) {
      pauseAll();
    } else {
      playAll();
    }
  };

  // Seek all videos
  const handleSeek = (value: number[]) => {
    const time = value[0];
    isSeekingRef.current = true;
    setCurrentTime(time);
    syncVideos(time);
    
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 100);
  };

  // Reset to beginning
  const handleReset = () => {
    pauseAll();
    setCurrentTime(0);
    syncVideos(0);
  };

  // Toggle mute and set which video has audio
  const handleAudioToggle = (index: number) => {
    if (activeAudioIndex === index && !isMuted) {
      setIsMuted(true);
    } else {
      setActiveAudioIndex(index);
      setIsMuted(false);
    }
  };

  // Update mute state on videos
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        video.muted = isMuted || index !== activeAudioIndex;
      }
    });
  }, [isMuted, activeAudioIndex]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get video URL from storage path
  const getVideoUrl = (storagePath: string) => {
    return `https://vhagqzzodmathyfbgjxr.supabase.co/storage/v1/object/public/videos/${storagePath}`;
  };

  // Grid layout calculations
  const getGridClass = () => {
    const count = videos.length;
    if (layoutMode === 'focus') {
      return 'grid-cols-1';
    }
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  if (videos.length === 0) {
    return (
      <Card className="glass-card p-8 text-center">
        <p className="text-muted-foreground">No videos to display</p>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Multi-Angle Player</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={layoutMode === 'grid' ? 'secondary' : 'ghost'}
            onClick={() => setLayoutMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={layoutMode === 'focus' ? 'secondary' : 'ghost'}
            onClick={() => setLayoutMode('focus')}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`grid ${getGridClass()} gap-2`}>
        {layoutMode === 'focus' ? (
          // Focus mode - show one large video with thumbnails
          <>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={(el) => { videoRefs.current[focusedVideoIndex] = el; }}
                src={getVideoUrl(videos[focusedVideoIndex].storage_path)}
                className="w-full h-full object-contain"
                playsInline
                muted={isMuted || focusedVideoIndex !== activeAudioIndex}
                onTimeUpdate={focusedVideoIndex === 0 ? handleTimeUpdate : undefined}
                onEnded={pauseAll}
              />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {videos[focusedVideoIndex].profiles?.username || 'Unknown'}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => handleAudioToggle(focusedVideoIndex)}
              >
                {isMuted || focusedVideoIndex !== activeAudioIndex ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>
            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto py-2">
              {videos.map((video, index) => (
                <button
                  key={video.id}
                  onClick={() => setFocusedVideoIndex(index)}
                  className={`relative shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    index === focusedVideoIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <video
                    ref={(el) => { if (index !== focusedVideoIndex) videoRefs.current[index] = el; }}
                    src={getVideoUrl(video.storage_path)}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute bottom-1 left-1">
                    <Badge variant="secondary" className="text-[10px] px-1">
                      {video.profiles?.username?.slice(0, 8) || '?'}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          // Grid mode - show all videos
          videos.map((video, index) => (
            <div
              key={video.id}
              className="relative aspect-video bg-black rounded-lg overflow-hidden"
            >
              <video
                ref={(el) => { videoRefs.current[index] = el; }}
                src={getVideoUrl(video.storage_path)}
                className="w-full h-full object-contain"
                playsInline
                muted={isMuted || index !== activeAudioIndex}
                onTimeUpdate={index === 0 ? handleTimeUpdate : undefined}
                onEnded={pauseAll}
              />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {video.profiles?.username || 'Unknown'}
                </Badge>
              </div>
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 w-7 h-7"
                onClick={() => handleAudioToggle(index)}
              >
                {isMuted || index !== activeAudioIndex ? (
                  <VolumeX className="w-3 h-3" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Playback Controls */}
      <div className="space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            className="gradient-primary w-14 h-14 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Video info */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>{videos.length} angles</span>
        <span>•</span>
        <span>Click speaker icon to select audio source</span>
      </div>
    </Card>
  );
};

export default MultiAnglePlayer;