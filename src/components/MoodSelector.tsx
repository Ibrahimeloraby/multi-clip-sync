import { MOODS, type Mood } from "@/lib/moods";
import { cn } from "@/lib/utils";

interface MoodSelectorProps {
  selected: string | null;
  onSelect: (moodId: string) => void;
  compact?: boolean;
}

export default function MoodSelector({ selected, onSelect, compact = false }: MoodSelectorProps) {
  return (
    <div className={cn(
      "grid gap-3",
      compact
        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
    )}>
      {MOODS.map((mood) => (
        <MoodCard
          key={mood.id}
          mood={mood}
          isSelected={selected === mood.id}
          onSelect={onSelect}
          compact={compact}
        />
      ))}
    </div>
  );
}

function MoodCard({
  mood,
  isSelected,
  onSelect,
  compact,
}: {
  mood: Mood;
  isSelected: boolean;
  onSelect: (id: string) => void;
  compact: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(mood.id)}
      className={cn(
        "relative flex flex-col items-center text-center rounded-xl border-2 transition-all duration-200 cursor-pointer",
        "hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        compact ? "p-3 gap-1.5" : "p-4 gap-2",
        `bg-gradient-to-br ${mood.gradient}`,
        isSelected
          ? `${mood.borderColor} shadow-md scale-105`
          : "border-transparent hover:border-border"
      )}
      aria-pressed={isSelected}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-current">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <span className={cn("leading-none", compact ? "text-2xl" : "text-3xl")}>{mood.emoji}</span>
      <span className={cn(
        "font-semibold text-foreground leading-tight",
        compact ? "text-xs" : "text-sm"
      )}>
        {mood.label}
      </span>
      {!compact && (
        <span className="text-xs text-muted-foreground leading-snug">{mood.description}</span>
      )}
    </button>
  );
}
