import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ZoomIn, ZoomOut, Flashlight, FlashlightOff, SwitchCamera, Film, Radio, Globe, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ZOOM_PRESETS, ZOOM_LIMITS } from "@/lib/constants";

interface CameraControlsProps {
  stream: MediaStream | null;
  facingMode: "user" | "environment";
  onFacingModeChange: (mode: "user" | "environment") => void;
  onGoLive?: () => void;
  onShowNearby?: () => void;
  onShare?: () => void;
  onMonitor?: () => void;
  videoContainerRef?: React.RefObject<HTMLElement>;
}

interface CameraCapabilities {
  zoom: { min: number; max: number; step: number } | null;
  torch: boolean;
}

interface ExtendedMediaTrackCapabilities {
  zoom?: { min: number; max: number; step: number };
  torch?: boolean;
}

interface ExtendedMediaTrackSettings {
  zoom?: number;
}

const CameraControls = ({ stream, facingMode, onFacingModeChange, onGoLive, onShowNearby, onShare, onMonitor, videoContainerRef }: CameraControlsProps) => {
  const navigate = useNavigate();
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    zoom: null,
    torch: false,
  });
  const [currentZoom, setCurrentZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);
  const [showZoomPresets, setShowZoomPresets] = useState(false);

  // Pinch-to-zoom tracking
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
  } | null>(null);

  useEffect(() => {
    if (!stream) {
      setCapabilities({ zoom: null, torch: false });
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const caps = videoTrack.getCapabilities() as unknown as ExtendedMediaTrackCapabilities;
      
      if (caps) {
        const zoomCaps = caps.zoom ? {
          min: caps.zoom.min || 1,
          max: caps.zoom.max || 1,
          step: caps.zoom.step || 0.1,
        } : null;

        setCapabilities({
          zoom: zoomCaps && zoomCaps.max > 1 ? zoomCaps : null,
          torch: !!caps.torch,
        });

        const settings = videoTrack.getSettings() as unknown as ExtendedMediaTrackSettings;
        if (settings?.zoom) {
          setCurrentZoom(settings.zoom);
        }
      }
    } catch (error) {
      console.log("Camera capabilities not available:", error);
    }
  }, [stream]);

  const handleZoomChange = useCallback(async (value: number[]) => {
    if (!stream || !capabilities.zoom) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const zoomValue = value[0];
    setCurrentZoom(zoomValue);

    try {
      await videoTrack.applyConstraints({
        advanced: [{ zoom: zoomValue } as unknown as MediaTrackConstraintSet],
      });
    } catch (error) {
      console.error("Failed to apply zoom:", error);
    }
  }, [stream, capabilities.zoom]);

  const toggleTorch = useCallback(async () => {
    if (!stream || !capabilities.torch) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const newState = !torchOn;

    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: newState } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(newState);
    } catch (error) {
      console.error("Failed to toggle torch:", error);
    }
  }, [stream, capabilities.torch, torchOn]);

  const handleSwitchCamera = () => {
    onFacingModeChange(facingMode === "user" ? "environment" : "user");
  };

  // Handle zoom preset selection
  const handleZoomPreset = useCallback((presetValue: number) => {
    if (!capabilities.zoom) return;
    const clampedValue = Math.max(
      capabilities.zoom.min,
      Math.min(presetValue, capabilities.zoom.max)
    );
    handleZoomChange([clampedValue]);
    setShowZoomPresets(false);
  }, [capabilities.zoom, handleZoomChange]);

  // Pinch-to-zoom handlers
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && capabilities.zoom) {
      pinchStateRef.current = {
        initialDistance: getTouchDistance(e.touches),
        initialZoom: currentZoom,
      };
    }
  }, [capabilities.zoom, currentZoom]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && pinchStateRef.current && capabilities.zoom) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / pinchStateRef.current.initialDistance;
      const newZoom = pinchStateRef.current.initialZoom * scale;
      const clampedZoom = Math.max(
        capabilities.zoom.min,
        Math.min(newZoom, capabilities.zoom.max)
      );
      handleZoomChange([clampedZoom]);
    }
  }, [capabilities.zoom, handleZoomChange]);

  const handleTouchEnd = useCallback(() => {
    pinchStateRef.current = null;
  }, []);

  // Attach pinch-to-zoom to video container
  useEffect(() => {
    const container = videoContainerRef?.current;
    if (!container || !capabilities.zoom) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [videoContainerRef, capabilities.zoom, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const hasZoom = capabilities.zoom && capabilities.zoom.max > 1;
  const hasTorch = capabilities.torch && facingMode === "environment";

  // Yellow neon button style - larger touch targets for mobile (min 44px recommended, using 48px)
  const neonYellow = "w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#FFFF00]/90 backdrop-blur-sm text-black active:bg-[#FFFF00] active:scale-90 shadow-lg shadow-[#FFFF00]/30 transition-all touch-manipulation";

  return (
    <div className="flex flex-col gap-2">
      {/* Monitor Button - for session owners to view participant feeds */}
      {onMonitor && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMonitor}
          className={neonYellow}
        >
          <Eye className="w-5 h-5" />
        </Button>
      )}

      {/* Go Live Button */}
      {onGoLive && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onGoLive}
          className={neonYellow}
        >
          <Radio className="w-5 h-5" />
        </Button>
      )}


      {/* Divider */}
      <div className="w-8 h-px bg-[#FFFF00]/40 mx-auto my-0.5" />

      {/* Camera Switch */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSwitchCamera}
        className={neonYellow}
      >
        <SwitchCamera className="w-5 h-5" />
      </Button>

      {/* Torch Toggle */}
      {hasTorch && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTorch}
          className={cn(
            neonYellow,
            torchOn && "bg-[#FFFF00] ring-2 ring-[#FFFF00]/50"
          )}
        >
          {torchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
        </Button>
      )}

      {/* Zoom Control - enhanced with presets and pinch-to-zoom */}
      {hasZoom && (
        <div className="flex flex-col items-center gap-1 py-2 touch-manipulation relative">
          <button
            onClick={() => handleZoomChange([Math.min(currentZoom + 0.5, capabilities.zoom!.max)])}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-[#FFFF00]/30 active:scale-90 transition-transform"
          >
            <ZoomIn className="w-4 h-4 text-[#FFFF00]" />
          </button>
          <div className="h-20 w-1 bg-black/60 backdrop-blur-sm rounded-full relative overflow-hidden border border-[#FFFF00]/20">
            <div
              className="absolute bottom-0 left-0 right-0 bg-[#FFFF00] rounded-full transition-all"
              style={{
                height: `${((currentZoom - capabilities.zoom!.min) / (capabilities.zoom!.max - capabilities.zoom!.min)) * 100}%`
              }}
            />
          </div>
          <button
            onClick={() => handleZoomChange([Math.max(currentZoom - 0.5, capabilities.zoom!.min)])}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-[#FFFF00]/30 active:scale-90 transition-transform"
          >
            <ZoomOut className="w-4 h-4 text-[#FFFF00]" />
          </button>

          {/* Zoom value button that shows presets */}
          <button
            onClick={() => setShowZoomPresets(!showZoomPresets)}
            className="text-[10px] text-[#FFFF00] font-bold mt-0.5 px-2 py-1 rounded bg-black/40 hover:bg-black/60 transition-colors"
          >
            {currentZoom.toFixed(1)}x
          </button>

          {/* Zoom presets popup */}
          {showZoomPresets && (
            <div className="absolute right-full mr-2 bottom-0 bg-black/80 backdrop-blur-md rounded-lg p-2 flex flex-col gap-1 border border-[#FFFF00]/30">
              {ZOOM_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleZoomPreset(preset.value)}
                  disabled={preset.value > capabilities.zoom!.max}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                    Math.abs(currentZoom - preset.value) < 0.1
                      ? "bg-[#FFFF00] text-black"
                      : "text-[#FFFF00] hover:bg-[#FFFF00]/20",
                    preset.value > capabilities.zoom!.max && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="w-8 h-px bg-[#FFFF00]/40 mx-auto my-0.5" />

      {/* Videos/Feed Button - Combined */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/videos')}
        className={neonYellow}
      >
        <Film className="w-5 h-5" />
      </Button>

      {/* Share Button */}
      {onShare && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onShare}
          className={neonYellow}
        >
          <Share2 className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};

export default CameraControls;