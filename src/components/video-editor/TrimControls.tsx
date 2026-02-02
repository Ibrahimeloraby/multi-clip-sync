import { Slider } from "@/components/ui/slider";

interface TrimControlsProps {
  duration: number;
  trimStart: number;
  trimEnd: number;
  maxDuration?: number;
  onTrimChange: (start: number, end: number) => void;
  formatTime: (seconds: number) => string;
}

const TrimControls = ({
  duration,
  trimStart,
  trimEnd,
  maxDuration,
  onTrimChange,
  formatTime,
}: TrimControlsProps) => {
  const trimmedDuration = trimEnd - trimStart;
  const isOverLimit = maxDuration ? trimmedDuration > maxDuration : false;

  const handleTrimChange = (values: number[]) => {
    const [start, end] = values;
    const newEnd = maxDuration ? Math.min(end, start + maxDuration) : end;
    onTrimChange(start, newEnd);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Start</p>
          <p className="font-mono font-medium">{formatTime(trimStart)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Duration</p>
          <p className={`font-mono font-medium ${isOverLimit ? 'text-destructive' : ''}`}>
            {formatTime(trimmedDuration)}
            {maxDuration && <span className="text-muted-foreground"> / {maxDuration}s</span>}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">End</p>
          <p className="font-mono font-medium">{formatTime(trimEnd)}</p>
        </div>
      </div>

      {/* Trim Range Slider */}
      <div className="relative">
        <div 
          className="absolute h-2 bg-primary/30 rounded-full top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${(trimStart / duration) * 100}%`,
            width: `${((trimEnd - trimStart) / duration) * 100}%`,
          }}
        />
        <Slider
          value={[trimStart, trimEnd]}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={handleTrimChange}
          className="w-full"
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Drag the handles to set start and end points
      </p>
    </div>
  );
};

export default TrimControls;
