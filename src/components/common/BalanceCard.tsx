import { cn } from "@/lib/utils";
import { formatPoints, formatAED, getRelativeDate, formatDate, daysUntil } from "@/lib/utils";
import ProgramLogo from "./ProgramLogo";

interface ExpiryDate {
  amount: number;
  expires_at: string;
}

interface BalanceCardProps {
  userProgram: {
    id: string;
    current_balance: number;
    tier_name: string | null;
    expiry_dates: ExpiryDate[];
    last_updated_at: string;
    program?: {
      display_name_en: string;
      slug: string;
      category: string;
      logo_url: string | null;
      default_redemption_value_aed: number;
    };
  };
  onTap?: () => void;
  compact?: boolean;
}

function getNextExpiry(expiryDates: ExpiryDate[]): ExpiryDate | null {
  if (!expiryDates || expiryDates.length === 0) return null;
  const future = expiryDates
    .filter((e) => new Date(e.expires_at) > new Date())
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  return future[0] ?? null;
}

function ExpiryPill({ expiry }: { expiry: ExpiryDate }) {
  const days = daysUntil(expiry.expires_at);
  const urgent = days <= 30;

  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium",
        urgent
          ? "bg-red-50 text-red-600 border border-red-100"
          : "bg-amber-50 text-amber-700 border border-amber-100"
      )}
    >
      {expiry.amount.toLocaleString()} pts expire in {days}d
    </span>
  );
}

export default function BalanceCard({ userProgram, onTap, compact = false }: BalanceCardProps) {
  const { program, current_balance, tier_name, expiry_dates, last_updated_at } = userProgram;

  const aedValue =
    program && program.default_redemption_value_aed
      ? current_balance * program.default_redemption_value_aed
      : null;

  const nextExpiry = getNextExpiry(expiry_dates as ExpiryDate[]);

  if (compact) {
    return (
      <button
        onClick={onTap}
        className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-3 min-w-[180px] hover:shadow-md transition-shadow text-left"
      >
        {program && (
          <ProgramLogo program={program} size="sm" />
        )}
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate leading-tight">
            {program?.display_name_en ?? "Program"}
          </p>
          <p className="text-sm font-bold text-slate-900 leading-tight">
            {formatPoints(current_balance, program?.slug)}
          </p>
          {aedValue !== null && (
            <p className="text-[11px] text-slate-400 leading-tight">
              ≈ {formatAED(aedValue)}
            </p>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onTap}
      className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-center gap-3 mb-3">
        {program && (
          <ProgramLogo program={program} size="md" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">
            {program?.display_name_en ?? "Program"}
          </p>
          {tier_name && (
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {tier_name}
            </span>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="mb-2">
        <p className="text-2xl font-bold text-slate-900 leading-tight">
          {formatPoints(current_balance, program?.slug)}
        </p>
        {aedValue !== null && (
          <p className="text-sm text-slate-500">≈ {formatAED(aedValue)}</p>
        )}
      </div>

      {/* Expiry */}
      {nextExpiry && (
        <div className="mb-2">
          <ExpiryPill expiry={nextExpiry} />
        </div>
      )}

      {/* Last updated */}
      <p className="text-[11px] text-slate-400">
        Updated {getRelativeDate(last_updated_at)}
      </p>
    </button>
  );
}
