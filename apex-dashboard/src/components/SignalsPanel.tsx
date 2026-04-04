import { Zap } from "lucide-react";
import { Signal, SignalAction } from "../types";

interface SignalsPanelProps {
  signals: Record<string, Signal>;
}

const ACTION_STYLE: Record<SignalAction, string> = {
  BUY: "bg-apex-green/10 text-apex-green border border-apex-green/30",
  SELL: "bg-apex-red/10 text-apex-red border border-apex-red/30",
  HOLD: "bg-apex-muted text-apex-subtext border border-apex-border",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-apex-green" : pct >= 45 ? "bg-apex-yellow" : "bg-apex-red";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-apex-border rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-apex-subtext w-8 text-right">{pct}%</span>
    </div>
  );
}

function IndicatorBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-apex-muted text-apex-subtext">
      {label}: {value.toFixed(1)}
    </span>
  );
}

export function SignalsPanel({ signals }: SignalsPanelProps) {
  const entries = Object.entries(signals);

  return (
    <div className="bg-apex-surface border border-apex-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-apex-accent" />
        <span className="text-apex-subtext text-[10px] tracking-widest">SIGNALS</span>
      </div>

      {entries.length === 0 ? (
        <div className="text-apex-subtext text-xs py-4 text-center">Awaiting signals…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entries.map(([symbol, sig]) => (
            <div key={symbol} className="border border-apex-border rounded p-3 flex flex-col gap-2 hover:border-apex-accent/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-apex-accent font-bold">{symbol}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ACTION_STYLE[sig.action]}`}>
                  {sig.action}
                </span>
              </div>

              <div className="text-apex-subtext text-[10px] tracking-widest">CONFIDENCE</div>
              <ConfidenceBar value={sig.confidence} />

              <div className="flex items-center justify-between text-xs">
                <span className="text-apex-subtext">Price</span>
                <span className="text-apex-text">${sig.price.toFixed(2)}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                <IndicatorBadge label="RSI" value={sig.indicators.rsi} />
                <IndicatorBadge label="ADX" value={sig.indicators.adx} />
                {sig.indicators.macd_hist !== null && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    sig.indicators.macd_hist >= 0
                      ? "bg-apex-green/10 text-apex-green"
                      : "bg-apex-red/10 text-apex-red"
                  }`}>
                    MACD {sig.indicators.macd_hist >= 0 ? "▲" : "▼"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
