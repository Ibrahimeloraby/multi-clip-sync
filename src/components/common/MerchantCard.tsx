import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";

interface MerchantCardProps {
  merchant: {
    id: string;
    display_name_en: string;
    display_name_ar: string;
    category: string[];
    logo_url: string | null;
    is_verified: boolean;
  };
  ruleCount?: number;
  onSelect?: () => void;
  compact?: boolean;
}

function MerchantAvatar({
  name,
  logoUrl,
  size,
}: {
  name: string;
  logoUrl: string | null;
  size: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "w-9 h-9 text-sm" : "w-12 h-12 text-base";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn("rounded-xl object-cover flex-shrink-0", sizeClass)}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl flex-shrink-0 flex items-center justify-center font-semibold text-white bg-slate-600",
        sizeClass
      )}
    >
      {initials}
    </div>
  );
}

export default function MerchantCard({
  merchant,
  ruleCount,
  onSelect,
  compact = false,
}: MerchantCardProps) {
  const { language } = useAppContext();
  const displayName =
    language === "ar" ? merchant.display_name_ar : merchant.display_name_en;

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-3 hover:shadow-md transition-shadow text-left w-full"
      >
        <MerchantAvatar name={merchant.display_name_en} logoUrl={merchant.logo_url} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-slate-900 truncate">{displayName}</span>
            {merchant.is_verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            )}
          </div>
          {ruleCount !== undefined && (
            <span className="text-[11px] text-slate-400">
              {ruleCount} {ruleCount === 1 ? "offer" : "offers"}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-start gap-3">
        <MerchantAvatar name={merchant.display_name_en} logoUrl={merchant.logo_url} size="md" />

        <div className="flex-1 min-w-0">
          {/* Name + verified */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-semibold text-slate-900 truncate">{displayName}</span>
            {merchant.is_verified && (
              <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>

          {/* Category chips */}
          {merchant.category.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {merchant.category.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="text-[11px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded capitalize"
                >
                  {cat}
                </span>
              ))}
              {merchant.category.length > 3 && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                  +{merchant.category.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Rule count badge */}
          {ruleCount !== undefined && (
            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
              {ruleCount} {ruleCount === 1 ? "offer" : "offers"}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
