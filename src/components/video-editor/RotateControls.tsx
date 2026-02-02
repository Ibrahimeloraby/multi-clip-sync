import { Button } from "@/components/ui/button";
import { RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface RotateControlsProps {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  onRotationChange: (rotation: number) => void;
  onFlipHChange: (flip: boolean) => void;
  onFlipVChange: (flip: boolean) => void;
}

const RotateControls = ({
  rotation,
  flipH,
  flipV,
  onRotationChange,
  onFlipHChange,
  onFlipVChange,
}: RotateControlsProps) => {
  const rotate90 = () => {
    onRotationChange((rotation + 90) % 360);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-yellow-400">{rotation}°</p>
        <p className="text-xs text-neutral-500">Rotation</p>
      </div>

      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={rotate90}
          className="flex flex-col gap-1 h-auto py-3 px-5 touch-manipulation border-neutral-700 text-neutral-400 hover:text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10"
        >
          <RotateCw className="w-6 h-6" />
          <span className="text-xs">Rotate 90°</span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => onFlipHChange(!flipH)}
          className={cn(
            "flex flex-col gap-1 h-auto py-3 px-5 touch-manipulation border-neutral-700 text-neutral-400 hover:text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10",
            flipH && "bg-yellow-500/20 border-yellow-500 text-yellow-400"
          )}
        >
          <FlipHorizontal className="w-6 h-6" />
          <span className="text-xs">Flip H</span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => onFlipVChange(!flipV)}
          className={cn(
            "flex flex-col gap-1 h-auto py-3 px-5 touch-manipulation border-neutral-700 text-neutral-400 hover:text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10",
            flipV && "bg-yellow-500/20 border-yellow-500 text-yellow-400"
          )}
        >
          <FlipVertical className="w-6 h-6" />
          <span className="text-xs">Flip V</span>
        </Button>
      </div>

      <p className="text-xs text-neutral-500 text-center">
        Rotate or flip your video
      </p>
    </div>
  );
};

export default RotateControls;
