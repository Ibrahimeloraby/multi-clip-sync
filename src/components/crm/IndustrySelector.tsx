import { INDUSTRIES } from "@/lib/crm/industries";
import type { IndustryTemplate } from "@/types/crm";
import { cn } from "@/lib/utils";

interface Props {
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function IndustrySelector({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {INDUSTRIES.map((industry) => (
        <IndustryCard
          key={industry.id}
          industry={industry}
          isSelected={selected === industry.id}
          onSelect={() => onSelect(industry.id)}
        />
      ))}
    </div>
  );
}

function IndustryCard({
  industry,
  isSelected,
  onSelect,
}: {
  industry: IndustryTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:border-primary/60 hover:bg-primary/5",
        isSelected ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card"
      )}
    >
      <span className="text-3xl">{industry.icon}</span>
      <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
        {industry.label}
      </span>
    </button>
  );
}
