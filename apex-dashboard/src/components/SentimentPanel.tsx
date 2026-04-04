import { Brain } from "lucide-react";
import { SentimentData, SentimentLabel } from "../types";

interface SentimentPanelProps {
  sentiment: Record<string, SentimentData>;
}

const LABEL_STYLE: Record<SentimentLabel, { text: string; bar: string; badge: string }> = {
  BULLISH: {
    text: "text-apex-green",
    bar: "bg-apex-green",
    badge: "bg-apex-green/10 text-apex-green border-apex-green/30",
  },
  BEARISH: {
    text: "text-apex-red",
    bar: "bg-apex-red",
    badge: "bg-apex-red/10 text-apex-red border-apex-red/30",
  },
  NEUTRAL: {
    text: "text-apex-subtext",
    bar: "bg-apex-subtext",
    badge: "bg-apex-muted text-apex-subtext border-apex-border",
  },
};

function SentimentGauge({ score }: { score: number }) {
  // score: -1..+1 → map to 0..100 for gauge
  const pct = ((score + 1) / 2) * 100;
  const clamp = Math.max(0, Math.min(100, pct));

  return (
    <div className="relative w-full h-2 bg-apex-border rounded-full overflow-visible">
      {/* Gradient track */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-apex-red via-apex-subtext to-apex-green rounded-full"
        style={{ width: "100%" }}
      />
      {/* Needle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-apex-bg bg-apex-text shadow"
        style={{ left: `calc(${clamp}% - 6px)` }}
      />
    </div>
  );
}

export function SentimentPanel({ sentiment }: SentimentPanelProps) {
  const entries = Object.entries(sentiment);

  return (
    <div className="bg-apex-surface border border-apex-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-apex-accent" />
        <span className="text-apex-subtext text-[10px] tracking-widest">CLAUDE SENTIMENT</span>
        <span className="ml-auto text-apex-subtext text-[9px]">claude-opus-4-6</span>
      </div>

      {entries.length === 0 ? (
        <div className="text-apex-subtext text-xs py-4 text-center">No sentiment data</div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map(([symbol, s]) => {
            const style = LABEL_STYLE[s.label];
            return (
              <div key={symbol} className="border border-apex-border rounded p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-apex-accent font-bold">{symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-semibold border px-1.5 py-0.5 rounded ${style.badge}`}>
                      {s.label}
                    </span>
                    <span className="text-apex-subtext text-[10px]">
                      {s.source_count} sources
                    </span>
                  </div>
                </div>

                <SentimentGauge score={s.score} />

                <div className="flex justify-between text-[10px]">
                  <span className="text-apex-subtext">Bearish</span>
                  <span className={`font-semibold ${style.text}`}>
                    {s.score >= 0 ? "+" : ""}{s.score.toFixed(2)}
                  </span>
                  <span className="text-apex-subtext">Bullish</span>
                </div>

                <p className="text-apex-subtext text-[10px] leading-relaxed italic">
                  "{s.summary}"
                </p>

                {s.signals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.signals.slice(0, 4).map((sig, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-apex-muted text-apex-subtext">
                        {sig}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <div className="flex-1 h-0.5 bg-apex-border rounded overflow-hidden">
                    <div className="h-full bg-apex-accent/50" style={{ width: `${s.confidence * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-apex-subtext">{Math.round(s.confidence * 100)}% conf</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
