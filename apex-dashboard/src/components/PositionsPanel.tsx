import { Layers } from "lucide-react";
import { Position } from "../types";

interface PositionsPanelProps {
  positions: Position[];
}

export function PositionsPanel({ positions }: PositionsPanelProps) {
  return (
    <div className="bg-apex-surface border border-apex-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-apex-accent" />
        <span className="text-apex-subtext text-[10px] tracking-widest">OPEN POSITIONS</span>
        <span className="ml-auto bg-apex-muted text-apex-subtext text-[10px] px-2 py-0.5 rounded">
          {positions.length}
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="text-apex-subtext text-xs py-4 text-center">No open positions</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-apex-subtext text-[10px] tracking-widest border-b border-apex-border">
                <th className="text-left py-1.5 pr-4">SYMBOL</th>
                <th className="text-right pr-4">QTY</th>
                <th className="text-right pr-4">AVG COST</th>
                <th className="text-right pr-4">PRICE</th>
                <th className="text-right pr-4">VALUE</th>
                <th className="text-right">UNREAL P&L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.symbol} className="border-b border-apex-border/40 hover:bg-apex-muted/30 transition-colors">
                  <td className="py-2 pr-4 text-apex-accent font-semibold">{p.symbol}</td>
                  <td className="text-right pr-4 text-apex-text">{p.quantity.toFixed(0)}</td>
                  <td className="text-right pr-4 text-apex-subtext">{p.avg_cost.toFixed(2)}</td>
                  <td className="text-right pr-4 text-apex-text">{p.market_price.toFixed(2)}</td>
                  <td className="text-right pr-4 text-apex-text">
                    {p.market_value.toLocaleString("en-AE", { minimumFractionDigits: 0 })}
                  </td>
                  <td className={`text-right font-semibold ${p.unrealized_pnl >= 0 ? "text-apex-green" : "text-apex-red"}`}>
                    {p.unrealized_pnl >= 0 ? "+" : ""}{p.unrealized_pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
