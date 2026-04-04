import { ScrollText } from "lucide-react";
import { Trade } from "../types";

interface TradeLogProps {
  trades: Trade[];
}

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: "text-apex-yellow",
  FILLED: "text-apex-green",
  CANCELLED: "text-apex-subtext",
  ERROR: "text-apex-red",
  PreSubmitted: "text-apex-yellow",
  Submitted: "text-apex-yellow",
  Filled: "text-apex-green",
  Cancelled: "text-apex-subtext",
};

export function TradeLog({ trades }: TradeLogProps) {
  const sorted = [...trades].reverse(); // newest first

  return (
    <div className="bg-apex-surface border border-apex-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ScrollText className="w-4 h-4 text-apex-accent" />
        <span className="text-apex-subtext text-[10px] tracking-widest">TRADE LOG</span>
        <span className="ml-auto bg-apex-muted text-apex-subtext text-[10px] px-2 py-0.5 rounded">
          {trades.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-apex-subtext text-xs py-4 text-center">No trades executed yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-apex-subtext text-[10px] tracking-widest border-b border-apex-border">
                <th className="text-left py-1.5 pr-3">TIME</th>
                <th className="text-left pr-3">SYM</th>
                <th className="text-left pr-3">SIDE</th>
                <th className="text-right pr-3">QTY</th>
                <th className="text-right pr-3">FILL</th>
                <th className="text-right">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 30).map((t) => {
                const time = new Date(t.submitted_at).toLocaleTimeString();
                return (
                  <tr key={t.order_id} className="border-b border-apex-border/30 hover:bg-apex-muted/20 transition-colors">
                    <td className="py-1.5 pr-3 text-apex-subtext">{time}</td>
                    <td className="pr-3 text-apex-accent font-semibold">{t.symbol}</td>
                    <td className={`pr-3 font-semibold ${t.action === "BUY" ? "text-apex-green" : "text-apex-red"}`}>
                      {t.action}
                    </td>
                    <td className="text-right pr-3 text-apex-text">{t.quantity}</td>
                    <td className="text-right pr-3 text-apex-text">
                      {t.fill_price ? `$${t.fill_price.toFixed(2)}` : "—"}
                    </td>
                    <td className={`text-right text-[10px] font-semibold ${STATUS_COLOR[t.status] ?? "text-apex-subtext"}`}>
                      {t.status.toUpperCase()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
