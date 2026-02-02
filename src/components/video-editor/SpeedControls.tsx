import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpeedControlsProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const speedOptions = [
  { value: 0.25, label: "0.25x" },
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];

const SpeedControls = ({ speed, onSpeedChange }: SpeedControlsProps) => {
  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-yellow-400">{speed}x</p>
        <p className="text-xs text-neutral-500">Playback Speed</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {speedOptions.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            onClick={() => onSpeedChange(option.value)}
            className={cn(
              "min-w-[60px] touch-manipulation border-neutral-700 text-neutral-400 hover:text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10",
              speed === option.value && "bg-yellow-500/20 border-yellow-500 text-yellow-400 ring-1 ring-yellow-500/50"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <p className="text-xs text-neutral-500 text-center">
        Slow motion or speed up your video
      </p>
    </div>
  );
};

export default SpeedControls;
