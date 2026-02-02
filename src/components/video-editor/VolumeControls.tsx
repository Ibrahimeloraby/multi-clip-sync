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
          variant="outline"
          size="lg"
          onClick={() => onMutedChange(false)}
          className={cn(
            "flex flex-col gap-1 h-auto py-3 px-6 touch-manipulation border-neutral-700 text-neutral-400 hover:text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10",
            !muted && "bg-yellow-500/20 border-yellow-500 text-yellow-400"
          )}
        >
          <Volume2 className="w-6 h-6" />
          <span className="text-xs">Sound On</span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => onMutedChange(true)}
          className={cn(
            "flex flex-col gap-1 h-auto py-3 px-6 touch-manipulation border-neutral-700 text-neutral-400 hover:text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10",
            muted && "bg-yellow-500/20 border-yellow-500 text-yellow-400"
          )}
        >
          <VolumeX className="w-6 h-6" />
          <span className="text-xs">Mute</span>
        </Button>
      </div>

      {!muted && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Volume Level</span>
            <span className="font-mono text-yellow-400">{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => onVolumeChange(v)}
            className="w-full [&_[data-slot=track]]:bg-neutral-700 [&_[data-slot=range]]:bg-yellow-400 [&_[data-slot=thumb]]:bg-yellow-400 [&_[data-slot=thumb]]:border-yellow-500"
          />
        </div>
      )}

      <p className="text-xs text-neutral-500 text-center">
        {muted ? "Audio will be removed from the video" : "Adjust the audio level"}
      </p>
    </div>
  );
};

export default VolumeControls;
