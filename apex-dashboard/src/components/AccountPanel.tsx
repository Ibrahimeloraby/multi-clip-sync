import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react";
import { AccountSummary } from "../types";

interface AccountPanelProps {
  account: AccountSummary | null;
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-apex-subtext text-[10px] tracking-widest">{label}</span>
      <span className={`font-semibold ${
        positive === undefined ? "text-apex-text" :
        positive ? "text-apex-green" : "text-apex-red"
      }`}>
        {value}
      </span>
    </div>
  );
}

export function AccountPanel({ account }: AccountPanelProps) {
  if (!account) {
    return (
      <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
        <div className="text-apex-subtext text-xs animate-pulse">Loading account…</div>
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString("en-AE", { minimumFractionDigits: 2 });
  const totalPnl = account.realized_pnl + account.unrealized_pnl;

  return (
    <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-apex-accent" />
        <span className="text-apex-subtext text-[10px] tracking-widest">ACCOUNT</span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="NET LIQUIDATION" value={`${account.currency} ${fmt(account.net_liquidation)}`} />
        <Metric label="AVAILABLE FUNDS" value={`${account.currency} ${fmt(account.available_funds)}`} />
        <Metric label="BUYING POWER" value={`${account.currency} ${fmt(account.buying_power)}`} />
        <Metric
          label="TOTAL P&L"
          value={`${totalPnl >= 0 ? "+" : ""}${fmt(totalPnl)}`}
          positive={totalPnl >= 0}
        />
      </div>
    </div>
  );
}
