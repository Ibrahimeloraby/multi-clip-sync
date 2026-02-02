import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ZoomIn, ZoomOut, Flashlight, FlashlightOff, SwitchCamera, Film, Radio, Globe, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface CameraControlsProps {
  stream: MediaStream | null;
  facingMode: "user" | "environment";
  onFacingModeChange: (mode: "user" | "environment") => void;
  onGoLive?: () => void;
  onShowNearby?: () => void;
  onShare?: () => void;
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

const CameraControls = ({ stream, facingMode, onFacingModeChange, onGoLive, onShowNearby, onShare }: CameraControlsProps) => {
  const navigate = useNavigate();
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    zoom: null,
    torch: false,
  });
  const [currentZoom, setCurrentZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);

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

  const hasZoom = capabilities.zoom && capabilities.zoom.max > 1;
  const hasTorch = capabilities.torch && facingMode === "environment";

  // Yellow neon button style - larger touch targets for mobile (min 44px recommended, using 48px)
  const neonYellow = "w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#FFFF00]/90 backdrop-blur-sm text-black active:bg-[#FFFF00] active:scale-90 shadow-lg shadow-[#FFFF00]/30 transition-all touch-manipulation";

  return (
    <div className="flex flex-col gap-2">
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

      {/* Nearby Sessions (Globe) */}
      {onShowNearby && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onShowNearby}
          className={neonYellow}
        >
          <Globe className="w-5 h-5" />
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

      {/* Zoom Control - minimal design */}
      {hasZoom && (
        <div className="flex flex-col items-center gap-1 py-2 touch-manipulation">
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
          <span className="text-[10px] text-[#FFFF00] font-bold mt-0.5">{currentZoom.toFixed(1)}x</span>
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