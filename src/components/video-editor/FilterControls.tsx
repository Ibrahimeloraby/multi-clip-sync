import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface FilterControlsProps {
  brightness: number;
  contrast: number;
  saturation: number;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
}

const FilterControls = ({
  brightness,
  contrast,
  saturation,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
}: FilterControlsProps) => {
  const resetFilters = () => {
    onBrightnessChange(100);
    onContrastChange(100);
    onSaturationChange(100);
  };

  const isModified = brightness !== 100 || contrast !== 100 || saturation !== 100;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-yellow-400">Adjustments</span>
        {isModified && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters} 
            className="gap-1 h-7 text-neutral-400 hover:text-yellow-400 hover:bg-yellow-500/10"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Brightness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">Brightness</span>
          <span className="font-mono w-12 text-right text-yellow-400">{brightness}%</span>
        </div>
        <Slider
          value={[brightness]}
          min={50}
          max={150}
          step={1}
          onValueChange={([v]) => onBrightnessChange(v)}
          className="w-full [&_[data-slot=track]]:bg-neutral-700 [&_[data-slot=range]]:bg-yellow-400 [&_[data-slot=thumb]]:bg-yellow-400 [&_[data-slot=thumb]]:border-yellow-500"
        />
      </div>

      {/* Contrast */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">Contrast</span>
          <span className="font-mono w-12 text-right text-yellow-400">{contrast}%</span>
        </div>
        <Slider
          value={[contrast]}
          min={50}
          max={150}
          step={1}
          onValueChange={([v]) => onContrastChange(v)}
          className="w-full [&_[data-slot=track]]:bg-neutral-700 [&_[data-slot=range]]:bg-yellow-400 [&_[data-slot=thumb]]:bg-yellow-400 [&_[data-slot=thumb]]:border-yellow-500"
        />
      </div>

      {/* Saturation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">Saturation</span>
          <span className="font-mono w-12 text-right text-yellow-400">{saturation}%</span>
        </div>
        <Slider
          value={[saturation]}
          min={0}
          max={200}
          step={1}
          onValueChange={([v]) => onSaturationChange(v)}
          className="w-full [&_[data-slot=track]]:bg-neutral-700 [&_[data-slot=range]]:bg-yellow-400 [&_[data-slot=thumb]]:bg-yellow-400 [&_[data-slot=thumb]]:border-yellow-500"
        />
      </div>
    </div>
  );
};

export default FilterControls;
