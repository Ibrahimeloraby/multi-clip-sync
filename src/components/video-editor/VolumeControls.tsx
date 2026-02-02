import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface VolumeControlsProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (value: number) => void;
  onMutedChange: (muted: boolean) => void;
}

const VolumeControls = ({
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
}: VolumeControlsProps) => {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant={!muted ? "default" : "outline"}
          size="lg"
          onClick={() => onMutedChange(false)}
          className={cn(
            "flex flex-col gap-1 h-auto py-3 px-6 touch-manipulation",
            !muted && "ring-2 ring-primary ring-offset-2"
          )}
        >
          <Volume2 className="w-6 h-6" />
          <span className="text-xs">Sound On</span>
        </Button>

        <Button
          variant={muted ? "default" : "outline"}
          size="lg"
          onClick={() => onMutedChange(true)}
          className={cn(
            "flex flex-col gap-1 h-auto py-3 px-6 touch-manipulation",
            muted && "ring-2 ring-primary ring-offset-2"
          )}
        >
          <VolumeX className="w-6 h-6" />
          <span className="text-xs">Mute</span>
        </Button>
      </div>

      {!muted && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Volume Level</span>
            <span className="font-mono">{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => onVolumeChange(v)}
            className="w-full"
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {muted ? "Audio will be removed from the video" : "Adjust the audio level"}
      </p>
    </div>
  );
};

export default VolumeControls;
