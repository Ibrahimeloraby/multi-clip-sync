import { useState } from "react";
import { cn } from "@/lib/utils";
import { MOODS } from "@/agent/types";
import type { MoodType } from "@/agent/types";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onSelect: (mood: MoodType, description?: string) => void;
  loading?: boolean;
}

export default function MoodSelector({ selectedMood, onSelect, loading }: MoodSelectorProps) {
  const [localMood, setLocalMood] = useState<MoodType | null>(selectedMood);
  const [description, setDescription] = useState("");

  const handleFind = () => {
    if (!localMood) return;
    onSelect(localMood, description.trim() || undefined);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">How are you feeling?</h2>
        <p className="text-sm text-muted-foreground">
          Pick your mood and we'll match the perfect content from your platforms
        </p>
      </div>

      {/* Mood grid */}
      <div className="grid grid-cols-2 gap-3">
        {MOODS.map((mood) => {
          const isSelected = localMood === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => setLocalMood(mood.id)}
              className={cn(
                "relative rounded-xl p-4 text-left transition-all duration-200 border-2",
                "hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? `border-transparent bg-gradient-to-br ${mood.color} text-white shadow-lg shadow-black/20`
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="text-2xl mb-1">{mood.emoji}</div>
              <div className="font-semibold text-sm">{mood.label}</div>
              <div className={cn("text-xs mt-0.5", isSelected ? "text-white/80" : "text-muted-foreground")}>
                {mood.description}
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/80" />
              )}
            </button>
          );
        })}
      </div>

      {/* Optional context */}
      {localMood && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <label className="text-sm font-medium text-muted-foreground">
            Anything more specific? <span className="text-xs">(optional)</span>
          </label>
          <Textarea
            placeholder={`e.g. "something light I can watch with my family" or "I want to cry a little"`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
        </div>
      )}

      <Button
        onClick={handleFind}
        disabled={!localMood || loading}
        className="w-full h-12 text-base font-semibold gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Finding your match...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Find My Match
          </>
        )}
      </Button>
    </div>
  );
}
