"""
APEX.AI — Main orchestrator loop.

Ties together:
  MarketDataFeed → SentimentAggregator → SignalEngine
      → RiskManager → OrderManager → WebSocketServer

Loop cadence: every LOOP_INTERVAL_SECONDS (default 60 s).

Safety modes:
  DRY_RUN=true  (default) — pipeline runs fully, zero IBKR orders sent.
  DRY_RUN=false           — live/paper orders submitted to IBKR.
"""

from __future__ import annotations

import asyncio
import signal as _signal
import sys
from datetime import datetime

from loguru import logger

from agent.broker.ibkr_client import IBKRClient
from agent.broker.order_manager import OrderManager
from agent.config import settings
from agent.data.market_data import MarketDataFeed
from agent.risk.risk_manager import RiskManager
from agent.sentiment.aggregator import SentimentAggregator
from agent.signals.engine import Action, SignalEngine
from agent.utils.websocket_server import AgentState, WebSocketServer


# ── Logging setup ─────────────────────────────────────────────────────

logger.remove()
logger.add(sys.stderr, level="INFO", colorize=True, format=(
    "<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}"
))
logger.add("logs/apex_{time:YYYY-MM-DD}.log", rotation="1 day", retention="30 days", level="DEBUG")


# ── Orchestrator ──────────────────────────────────────────────────────


class ApexAgent:
    """Top-level async orchestrator for APEX.AI."""

    def __init__(self) -> None:
        self._ibkr = IBKRClient()
        self._market_data = MarketDataFeed(self._ibkr)
        self._sentiment = SentimentAggregator()
        self._signals = SignalEngine(self._market_data)
        self._risk = RiskManager()
        self._orders = OrderManager(self._ibkr)
        self._ws = WebSocketServer()
        self._running = False
        self._last_sentiment_refresh = 0.0
        self._cached_sentiments: dict = {}

    # ── Serialisation helpers ─────────────────────────────────────────

    @staticmethod
    def _serialise_account(account) -> dict:
        return {
            "net_liquidation": account.net_liquidation,
            "available_funds": account.available_funds,
            "buying_power": account.buying_power,
            "realized_pnl": account.realized_pnl,
            "unrealized_pnl": account.unrealized_pnl,
            "currency": account.currency,
        }

    @staticmethod
    def _serialise_positions(positions) -> list:
        return [
            {
                "symbol": p.symbol,
                "quantity": p.quantity,
                "avg_cost": p.avg_cost,
                "market_price": p.market_price,
                "market_value": p.market_value,
                "unrealized_pnl": p.unrealized_pnl,
            }
            for p in positions
        ]

    @staticmethod
    def _serialise_signals(signals) -> dict:
        out = {}
        for sym, sig in signals.items():
            ind = sig.indicators
            out[sym] = {
                "action": sig.action.value,
                "confidence": sig.confidence,
                "size_multiplier": sig.size_multiplier,
                "price": sig.price,
                "sentiment_score": sig.sentiment_score,
                "reasoning": sig.reasoning[:5],
                "indicators": {
                    "rsi": ind.rsi,
                    "macd_hist": ind.macd_hist,
                    "ema_20": ind.ema_20,
                    "ema_50": ind.ema_50,
                    "adx": ind.adx,
                } if ind else {},
                "timestamp": sig.timestamp.isoformat(),
            }
        return out

    @staticmethod
    def _serialise_sentiment(sentiments) -> dict:
        out = {}
        for sym, s in sentiments.items():
            out[sym] = {
                "score": s.score,
                "confidence": s.confidence,
                "label": s.label,
                "summary": s.summary,
                "signals": s.signals,
                "source_count": s.source_count,
                "timestamp": s.timestamp.isoformat(),
            }
        return out

    @staticmethod
    def _serialise_trades(records) -> list:
        return [
            {
                "order_id": r.order_id,
                "symbol": r.symbol,
                "action": r.action,
                "quantity": r.quantity,
                "order_type": r.order_type,
                "status": r.status,
                "dry_run": r.dry_run,
                "is_closing": r.is_closing,
                "submitted_at": r.submitted_at,
                "fill_price": r.fill_price,
            }
            for r in records[-50:]
        ]

    # ── Order execution (with position flip + duplicate guard) ─────────

    async def _execute_signals(self, signals, snapshots, pos_map, account) -> None:
        """
        Decide what to do for each signal, respecting:
          1. Duplicate guard  — skip if symbol already has an active order
          2. Position flip    — close existing long before going short
          3. No shorting      — SELL with no position is ignored (configurable)
          4. No add-on        — BUY when already long is skipped
          5. Bracket orders   — every entry has a stop-loss + take-profit
          6. DRY_RUN          — log everything, submit nothing
        """
        for sym, sig in signals.items():
            snap = snapshots.get(sym)
            if snap is None:
                continue

            existing_qty = pos_map.get(sym, 0.0)  # positive = long, negative = short

            # ── Duplicate guard ────────────────────────────────────────
            if self._orders.has_active_order(sym):
                logger.debug("SKIP {}: active order pending", sym)
                continue

            # ── HOLD → nothing to do ───────────────────────────────────
            if sig.action == Action.HOLD:
                continue

            # ── SELL signal ────────────────────────────────────────────
            if sig.action == Action.SELL:
                if existing_qty > 0:
                    # Close the long position
                    logger.info("FLIP {}: long {:.0f} shares → closing before potential re-entry", sym, existing_qty)
                    await self._orders.place_closing_order(sym, int(existing_qty), action="SELL")
                elif settings.allow_shorting:
                    # Open a short (only if explicitly enabled)
                    risk_result = self._risk.evaluate(sig, account, existing_qty)
                    if risk_result.approved:
                        await self._orders.place_bracket_order(sig, risk_result.quantity)
                    else:
                        for reason in risk_result.veto_reasons:
                            logger.info("VETOED {}: {}", sym, reason)
                else:
                    logger.debug("SKIP {} SELL: no long position and shorting disabled", sym)
                continue

            # ── BUY signal ─────────────────────────────────────────────
            if sig.action == Action.BUY:
                if existing_qty > 0:
                    logger.debug("SKIP {} BUY: already long {:.0f} shares", sym, existing_qty)
                    continue
                if existing_qty < 0:
                    # Close any short first
                    logger.info("FLIP {}: short {:.0f} shares → closing", sym, abs(existing_qty))
                    await self._orders.place_closing_order(sym, int(abs(existing_qty)), action="BUY")
                    continue  # re-entry on next loop after close confirms

                # Normal entry: run risk checks then bracket order
                risk_result = self._risk.evaluate(sig, account, existing_qty)
                if risk_result.approved:
                    await self._orders.place_bracket_order(sig, risk_result.quantity)
                else:
                    for reason in risk_result.veto_reasons:
                        logger.info("VETOED {}: {}", sym, reason)

    # ── Core loop ─────────────────────────────────────────────────────

    async def _run_once(self) -> AgentState:
        """Execute one full agent loop iteration."""
        state = AgentState(status="RUNNING" if not settings.dry_run else "DRY_RUN")

        # 1. Account snapshot
        account = await self._ibkr.get_account_summary()
        self._risk.update_nav(account.net_liquidation)
        state.account = self._serialise_account(account)

        # 2. Open positions
        positions = await self._ibkr.get_positions()
        state.positions = self._serialise_positions(positions)
        pos_map = {p.symbol: p.quantity for p in positions}

        # 3. Market data — all symbols in parallel
        snapshots = await self._market_data.get_all_snapshots(settings.symbols)

        # 4. Sentiment — refresh every 5 minutes
        now_epoch = datetime.utcnow().timestamp()
        if now_epoch - self._last_sentiment_refresh > 300:
            logger.info("Refreshing sentiment for {} symbols…", len(settings.symbols))
            self._cached_sentiments = await self._sentiment.aggregate_all(settings.symbols)
            self._last_sentiment_refresh = now_epoch
        state.sentiment = self._serialise_sentiment(self._cached_sentiments)

        # 5. Signal generation
        signals = await self._signals.generate_all(snapshots, self._cached_sentiments)
        state.signals = self._serialise_signals(signals)

        # 6. Execute (position flip + duplicate guard + bracket orders)
        await self._execute_signals(signals, snapshots, pos_map, account)

        # 7. Sync order statuses
        await self._orders.sync_order_statuses()
        recent_trades = self._orders.load_journal()
        state.trades = self._serialise_trades(recent_trades)

        return state

    # ── Lifecycle ─────────────────────────────────────────────────────

    async def start(self) -> None:
        """Connect to IBKR, start WS server, enter main loop."""
        logger.info("═══ APEX.AI STARTING ═══")

        if settings.dry_run:
            logger.warning("▶▶▶ DRY RUN MODE — no orders will be submitted to IBKR ◀◀◀")
            logger.warning("    Set DRY_RUN=false in .env when ready to trade")
        else:
            logger.warning("▶▶▶ LIVE MODE — real orders will be submitted to IBKR ◀◀◀")

        logger.info(
            "Symbols: {} | Loop: {}s | SL: {:.0%} | TP: {:.0%} | Shorting: {}",
            ", ".join(settings.symbols),
            settings.loop_interval_seconds,
            settings.stop_loss_pct,
            settings.take_profit_pct,
            settings.allow_shorting,
        )

        await self._ibkr.connect()
        asyncio.create_task(self._ws.serve())

        self._running = True
        loop_count = 0

        while self._running:
            loop_count += 1
            logger.info("── Loop #{} ──────────────────────────────────", loop_count)
            try:
                state = await self._run_once()
                await self._ws.broadcast(state)
                logger.info(
                    "Loop #{} complete | NAV={} {} | Clients={}",
                    loop_count,
                    state.account.get("net_liquidation", "?"),
                    settings.account_currency,
                    self._ws.client_count,
                )
            except Exception as exc:
                logger.exception("Loop #{} error: {}", loop_count, exc)
                await self._ws.broadcast_error(str(exc))

            await asyncio.sleep(settings.loop_interval_seconds)

    async def stop(self) -> None:
        self._running = False
        await self._sentiment.close()
        await self._ibkr.disconnect()
        logger.info("═══ APEX.AI STOPPED ═══")


# ── Entry point ───────────────────────────────────────────────────────


async def _main() -> None:
    agent = ApexAgent()

    loop = asyncio.get_running_loop()

    def _shutdown(*_):
        logger.info("Shutdown signal received…")
        loop.create_task(agent.stop())

    loop.add_signal_handler(_signal.SIGINT, _shutdown)
    loop.add_signal_handler(_signal.SIGTERM, _shutdown)

    await agent.start()


if __name__ == "__main__":
    asyncio.run(_main())
