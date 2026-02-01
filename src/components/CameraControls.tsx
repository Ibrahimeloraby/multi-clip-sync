import { useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Flashlight, FlashlightOff, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface CameraControlsProps {
  stream: MediaStream | null;
  facingMode: "user" | "environment";
  onFacingModeChange: (mode: "user" | "environment") => void;
}

interface CameraCapabilities {
  zoom: { min: number; max: number; step: number } | null;
  torch: boolean;
}

// Extended types for camera capabilities not in standard TypeScript types
interface ExtendedMediaTrackCapabilities {
  zoom?: { min: number; max: number; step: number };
  torch?: boolean;
}

interface ExtendedMediaTrackSettings {
  zoom?: number;
}

interface ExtendedMediaTrackConstraintSet {
  zoom?: number;
  torch?: boolean;
}

const CameraControls = ({ stream, facingMode, onFacingModeChange }: CameraControlsProps) => {
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    zoom: null,
    torch: false,
  });
  const [currentZoom, setCurrentZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);

  // Check camera capabilities when stream changes
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

        // Get current settings
        const settings = videoTrack.getSettings() as unknown as ExtendedMediaTrackSettings;
        if (settings?.zoom) {
          setCurrentZoom(settings.zoom);
        }
      }
    } catch (error) {
      console.log("Camera capabilities not available:", error);
    }
  }, [stream]);

  // Apply zoom
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

  // Toggle flashlight
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

  // Switch camera
  const handleSwitchCamera = () => {
    onFacingModeChange(facingMode === "user" ? "environment" : "user");
  };

  const hasZoom = capabilities.zoom && capabilities.zoom.max > 1;
  const hasTorch = capabilities.torch && facingMode === "environment";

  return (
    <div className="flex flex-col gap-4">
      {/* Camera Switch */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSwitchCamera}
        className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
      >
        <SwitchCamera className="w-6 h-6" />
      </Button>

      {/* Torch Toggle */}
      {hasTorch && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTorch}
          className={cn(
            "w-12 h-12 rounded-full backdrop-blur-sm text-white",
            torchOn ? "bg-yellow-500/80 hover:bg-yellow-500" : "bg-black/40 hover:bg-black/60"
          )}
        >
          {torchOn ? <Flashlight className="w-6 h-6" /> : <FlashlightOff className="w-6 h-6" />}
        </Button>
      )}

      {/* Zoom Control */}
      {hasZoom && (
        <div className="flex flex-col items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full py-3 px-2">
          <ZoomIn className="w-4 h-4 text-white/70" />
          <div className="h-24 w-8 flex items-center justify-center">
            <Slider
              value={[currentZoom]}
              min={capabilities.zoom!.min}
              max={capabilities.zoom!.max}
              step={capabilities.zoom!.step}
              onValueChange={handleZoomChange}
              orientation="vertical"
              className="h-full"
            />
          </div>
          <ZoomOut className="w-4 h-4 text-white/70" />
          <span className="text-[10px] text-white/70">{currentZoom.toFixed(1)}x</span>
        </div>
      )}
    </div>
  );
};

export default CameraControls;
