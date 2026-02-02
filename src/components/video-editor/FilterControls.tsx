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
        <span className="text-sm font-medium">Adjustments</span>
        {isModified && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 h-7">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Brightness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Brightness</span>
          <span className="font-mono w-12 text-right">{brightness}%</span>
        </div>
        <Slider
          value={[brightness]}
          min={50}
          max={150}
          step={1}
          onValueChange={([v]) => onBrightnessChange(v)}
          className="w-full"
        />
      </div>

      {/* Contrast */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Contrast</span>
          <span className="font-mono w-12 text-right">{contrast}%</span>
        </div>
        <Slider
          value={[contrast]}
          min={50}
          max={150}
          step={1}
          onValueChange={([v]) => onContrastChange(v)}
          className="w-full"
        />
      </div>

      {/* Saturation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Saturation</span>
          <span className="font-mono w-12 text-right">{saturation}%</span>
        </div>
        <Slider
          value={[saturation]}
          min={0}
          max={200}
          step={1}
          onValueChange={([v]) => onSaturationChange(v)}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default FilterControls;
