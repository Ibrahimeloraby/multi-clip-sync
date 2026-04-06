// ── Account ───────────────────────────────────────────────────────────

export interface AccountSummary {
  net_liquidation: number;
  available_funds: number;
  buying_power: number;
  realized_pnl: number;
  unrealized_pnl: number;
  currency: string;
}

// ── Positions ─────────────────────────────────────────────────────────

export interface Position {
  symbol: string;
  quantity: number;
  avg_cost: number;
  market_price: number;
  market_value: number;
  unrealized_pnl: number;
}

// ── Signals ───────────────────────────────────────────────────────────

export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface Indicators {
  rsi: number | null;
  macd_hist: number | null;
  ema_20: number | null;
  ema_50: number | null;
  adx: number | null;
}

export interface Signal {
  action: SignalAction;
  confidence: number;
  size_multiplier: number;
  price: number;
  sentiment_score: number;
  reasoning: string[];
  indicators: Indicators;
  timestamp: string;
}

// ── Sentiment ─────────────────────────────────────────────────────────

export type SentimentLabel = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface SentimentData {
  score: number;         // -1.0 … +1.0
  confidence: number;   // 0.0 … 1.0
  label: SentimentLabel;
  summary: string;
  signals: string[];
  source_count: number;
  timestamp: string;
}

// ── Trades ────────────────────────────────────────────────────────────

export interface Trade {
  order_id: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  order_type: string;
  status: string;
  dry_run: boolean;
  is_closing: boolean;
  submitted_at: string;
  fill_price: number | null;
}

// ── Agent state frame ─────────────────────────────────────────────────

export type AgentStatus = "RUNNING" | "PAUSED" | "ERROR" | "INITIALISING";

export interface AgentStateFrame {
  type: "state";
  timestamp: string;
  status: AgentStatus;
  account: AccountSummary;
  positions: Position[];
  signals: Record<string, Signal>;
  sentiment: Record<string, SentimentData>;
  trades: Trade[];
  error?: string;
}
