import { AlertCircle } from "lucide-react";
import { AccountPanel } from "./components/AccountPanel";
import { Header } from "./components/Header";
import { PositionsPanel } from "./components/PositionsPanel";
import { SentimentPanel } from "./components/SentimentPanel";
import { SignalsPanel } from "./components/SignalsPanel";
import { TradeLog } from "./components/TradeLog";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const { state, connectionStatus, lastUpdated } = useWebSocket();

  const agentStatus = state?.status ?? "INITIALISING";
  const account = state?.account ?? null;
  const positions = state?.positions ?? [];
  const signals = state?.signals ?? {};
  const sentiment = state?.sentiment ?? {};
  const trades = state?.trades ?? [];

  return (
    <div className="min-h-screen bg-apex-bg flex flex-col">
      <Header
        status={agentStatus}
        connectionStatus={connectionStatus}
        lastUpdated={lastUpdated}
        netLiquidation={account?.net_liquidation ?? 0}
        currency={account?.currency ?? "AED"}
      />

      <main className="flex-1 p-4 flex flex-col gap-4 max-w-screen-2xl mx-auto w-full">
        {/* Error banner */}
        {state?.error && (
          <div className="flex items-center gap-3 bg-apex-red/10 border border-apex-red/30 rounded-lg px-4 py-3 text-apex-red text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Disconnected banner */}
        {connectionStatus !== "connected" && !state && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="text-apex-accent text-4xl font-bold tracking-widest mb-2">APEX.AI</div>
              <div className="text-apex-subtext text-sm">
                {connectionStatus === "connecting"
                  ? "Connecting to agent…"
                  : "Disconnected — retrying…"}
              </div>
              <div className="mt-4 flex justify-center">
                <div className="w-8 h-8 border-2 border-apex-accent border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          </div>
        )}

        {/* Main grid — visible once we have state */}
        {state && (
          <>
            {/* Row 1: Account summary */}
            <AccountPanel account={account} />

            {/* Row 2: Signals + Sentiment side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <SignalsPanel signals={signals} />
              </div>
              <div className="xl:col-span-1">
                <SentimentPanel sentiment={sentiment} />
              </div>
            </div>

            {/* Row 3: Positions + Trade log */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PositionsPanel positions={positions} />
              <TradeLog trades={trades} />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-2 border-t border-apex-border text-center text-apex-subtext text-[10px] tracking-widest">
        APEX.AI — IBKR DUBAI (DIFC) — {new Date().getFullYear()}
      </footer>
    </div>
  );
}
