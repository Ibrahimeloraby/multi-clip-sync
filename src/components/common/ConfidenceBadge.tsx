import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number;
  status: string;
  showScore?: boolean;
}

const STATUS_CLASSES: Record<string, string> = {
  trusted: "bg-green-100 text-green-700 border-green-200",
  verified: "bg-blue-100 text-blue-700 border-blue-200",
  provisional: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending: "bg-slate-100 text-slate-500 border-slate-200",
  disputed: "bg-red-100 text-red-700 border-red-200",
  expired: "bg-slate-100 text-slate-400 border-slate-200 line-through",
};

const STATUS_LABELS: Record<string, string> = {
  trusted: "Trusted",
  verified: "Verified",
  provisional: "Provisional",
  pending: "Pending",
  disputed: "Disputed",
  expired: "Expired",
};

export default function ConfidenceBadge({ score, status, showScore = false }: ConfidenceBadgeProps) {
  const statusClass = STATUS_CLASSES[status] ?? STATUS_CLASSES.pending;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        statusClass
      )}
    >
      {label}
      {showScore && (
        <span className="opacity-70">({score})</span>
      )}
    </span>
  );
}
