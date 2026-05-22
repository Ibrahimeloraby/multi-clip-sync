import { Check, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ProgramLogo from "./ProgramLogo";
import ConfidenceBadge from "./ConfidenceBadge";

interface RuleCardProps {
  rule: {
    id: string;
    rule_type: string;
    earn_rate: number | null;
    multiplier: number | null;
    discount_pct: number | null;
    cashback_pct: number | null;
    confidence_score: number;
    status: string;
    source: string;
    confirmations: number;
    disputes: number;
    description_text: string | null;
    program?: {
      display_name_en: string;
      slug: string;
      category: string;
      logo_url: string | null;
    };
    merchant?: { display_name_en: string };
  };
  onConfirm?: () => void;
  onDispute?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

function getRuleDescription(rule: RuleCardProps["rule"]): string {
  if (rule.description_text) return rule.description_text;

  switch (rule.rule_type) {
    case "earn":
      return `Earn ${rule.earn_rate ?? "?"} pts per AED 1`;
    case "cashback":
      return `${rule.cashback_pct ?? "?"}% cashback`;
    case "discount":
      return `${rule.discount_pct ?? "?"}% discount`;
    case "bogo":
      return "2-for-1 offer";
    case "multiplier":
      return `${rule.multiplier ?? "?"}x points`;
    default:
      return rule.rule_type;
  }
}

const SOURCE_LABELS: Record<string, string> = {
  official: "Official",
  community: "Community",
  personal: "Personal",
  admin: "Official",
};

const SOURCE_CLASSES: Record<string, string> = {
  official: "bg-blue-50 text-blue-700 border-blue-200",
  community: "bg-violet-50 text-violet-700 border-violet-200",
  personal: "bg-slate-50 text-slate-600 border-slate-200",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function RuleCard({
  rule,
  onConfirm,
  onDispute,
  showActions = false,
  compact = false,
}: RuleCardProps) {
  const description = getRuleDescription(rule);
  const sourceLabel = SOURCE_LABELS[rule.source] ?? rule.source;
  const sourceClass = SOURCE_CLASSES[rule.source] ?? SOURCE_CLASSES.community;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Program logo */}
        {rule.program && (
          <ProgramLogo program={rule.program} size="sm" className="mt-0.5 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {/* Program name + merchant */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {rule.program && (
              <span className="text-xs font-semibold text-slate-700 truncate">
                {rule.program.display_name_en}
              </span>
            )}
            {rule.merchant && (
              <>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-xs text-slate-500 truncate">
                  {rule.merchant.display_name_en}
                </span>
              </>
            )}
          </div>

          {/* Rule description */}
          <p className={cn("font-medium text-slate-900 leading-snug", compact ? "text-sm" : "text-base")}>
            {description}
          </p>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <ConfidenceBadge score={rule.confidence_score} status={rule.status} showScore />

            {/* Source badge */}
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border",
                sourceClass
              )}
            >
              {sourceLabel}
            </span>

            {/* Confirmation count */}
            <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 font-medium">
              <Check className="w-3 h-3" />
              {rule.confirmations}
            </span>

            {/* Disputes (only show if > 0) */}
            {rule.disputes > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-red-500 font-medium">
                <Flag className="w-3 h-3" />
                {rule.disputes}
              </span>
            )}
          </div>

          {/* Actions */}
          {showActions && (onConfirm || onDispute) && (
            <div className="flex items-center gap-2 mt-3">
              {onConfirm && (
                <Button
                  size="sm"
                  onClick={onConfirm}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                >
                  <Check className="w-3 h-3 me-1" />
                  Confirm
                </Button>
              )}
              {onDispute && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDispute}
                  className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50 px-3"
                >
                  <Flag className="w-3 h-3 me-1" />
                  Dispute
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
