import { Activity, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { AgentStatus } from "../types";

interface HeaderProps {
  status: AgentStatus;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  lastUpdated: Date | null;
  netLiquidation: number;
  currency: string;
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; dot: string }> = {
  RUNNING: { label: "RUNNING", color: "text-apex-green", dot: "bg-apex-green animate-pulse" },
  PAUSED: { label: "PAUSED", color: "text-apex-yellow", dot: "bg-apex-yellow" },
  ERROR: { label: "ERROR", color: "text-apex-red", dot: "bg-apex-red animate-pulse" },
  INITIALISING: { label: "INIT", color: "text-apex-subtext", dot: "bg-apex-subtext animate-pulse" },
};

export function Header({ status, connectionStatus, lastUpdated, netLiquidation, currency }: HeaderProps) {
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.INITIALISING;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-apex-border bg-apex-surface">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded border border-apex-accent/40 glow-accent">
          <Activity className="w-5 h-5 text-apex-accent" />
        </div>
        <div>
          <span className="text-apex-accent font-bold text-lg tracking-widest">APEX</span>
          <span className="text-apex-subtext text-lg">.AI</span>
        </div>
        <span className="text-apex-border text-xs ml-2 hidden sm:block">
          AUTONOMOUS TRADING AGENT
        </span>
      </div>

      {/* Centre: agent status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
        <span className={`text-xs font-semibold tracking-widest ${sc.color}`}>{sc.label}</span>
      </div>

      {/* Right: NAV + connection */}
      <div className="flex items-center gap-6">
        <div className="text-right hidden md:block">
          <div className="text-apex-subtext text-[10px] tracking-widest">NET LIQUIDATION</div>
          <div className="text-apex-text font-semibold">
            {currency} {netLiquidation.toLocaleString("en-AE", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {connectionStatus === "connected" ? (
            <Wifi className="w-4 h-4 text-apex-green" />
          ) : connectionStatus === "connecting" ? (
            <Wifi className="w-4 h-4 text-apex-yellow animate-pulse" />
          ) : (
            <WifiOff className="w-4 h-4 text-apex-red" />
          )}
          <div className="text-right">
            <div className={`text-[10px] font-semibold tracking-widest ${
              connectionStatus === "connected" ? "text-apex-green" :
              connectionStatus === "connecting" ? "text-apex-yellow" : "text-apex-red"
            }`}>
              {connectionStatus.toUpperCase()}
            </div>
            {lastUpdated && (
              <div className="text-apex-subtext text-[9px]">
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
