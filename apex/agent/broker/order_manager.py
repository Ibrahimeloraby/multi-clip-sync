"""
APEX.AI — Order execution and tracking.

Features:
  - DRY_RUN mode: full pipeline runs but nothing is submitted to IBKR
  - Duplicate order guard: one active order per symbol at a time
  - Bracket orders: every entry comes with a stop-loss + take-profit
  - Position flip: close existing position before reversing direction
  - JSONL trade journal: full audit trail at apex/trades.jsonl
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set

from ib_async import LimitOrder, MarketOrder, Order, StopOrder, Trade
from loguru import logger

from agent.broker.ibkr_client import IBKRClient
from agent.config import settings
from agent.signals.engine import Action, Signal


# ── Data classes ──────────────────────────────────────────────────────


@dataclass
class OrderRecord:
    order_id: str
    ibkr_order_id: Optional[int]
    symbol: str
    action: str               # "BUY" | "SELL"
    quantity: int
    order_type: str           # "MKT" | "LMT" | "STP" | "BRACKET"
    limit_price: Optional[float]
    stop_price: Optional[float]
    submitted_at: str
    filled_at: Optional[str] = None
    fill_price: Optional[float] = None
    status: str = "SUBMITTED"
    dry_run: bool = False
    is_closing: bool = False   # True when closing an existing position
    signal_confidence: float = 0.0
    signal_reasoning: List[str] = field(default_factory=list)


# ── Manager ───────────────────────────────────────────────────────────


class OrderManager:
    """
    Executes orders through IBKR with safety guards.

    DRY_RUN mode (settings.dry_run = True):
      Every order is logged and journalled but never sent to IBKR.
      The dashboard shows "DRY" status. Switch off only when ready.

    Duplicate guard:
      _active_symbols tracks symbols with an open/pending order.
      A second signal for the same symbol is ignored until the first
      order fills or is cancelled.

    Bracket orders:
      Every BUY is wrapped with a stop-loss SELL and take-profit SELL
      as an IBKR OCA (One Cancels All) group.
    """

    JOURNAL_PATH = Path(__file__).parent.parent.parent / "trades.jsonl"

    def __init__(self, ibkr: IBKRClient) -> None:
        self._ibkr = ibkr
        self._open_orders: Dict[str, OrderRecord] = {}
        self._active_symbols: Set[str] = set()   # duplicate guard
        self.JOURNAL_PATH.parent.mkdir(parents=True, exist_ok=True)

    # ── Internal helpers ──────────────────────────────────────────────

    def _log_order(self, record: OrderRecord) -> None:
        try:
            with self.JOURNAL_PATH.open("a") as f:
                f.write(json.dumps(asdict(record)) + "\n")
        except Exception as exc:
            logger.error("Failed to write trade journal: {}", exc)

    def _dry_run_record(
        self,
        signal: Signal,
        quantity: int,
        order_type: str,
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
        is_closing: bool = False,
    ) -> OrderRecord:
        """Create a journalled-but-not-submitted order record for DRY_RUN."""
        record = OrderRecord(
            order_id=str(uuid.uuid4()),
            ibkr_order_id=None,
            symbol=signal.symbol,
            action=signal.action.value,
            quantity=quantity,
            order_type=order_type,
            limit_price=limit_price,
            stop_price=stop_price,
            submitted_at=datetime.utcnow().isoformat(),
            status="DRY",
            dry_run=True,
            is_closing=is_closing,
            signal_confidence=signal.confidence,
            signal_reasoning=signal.reasoning[:5],
        )
        self._log_order(record)
        logger.info(
            "[DRY RUN] {} {} × {} | SL={} TP={} | conf={:.0%}",
            signal.action.value, quantity, signal.symbol,
            f"{stop_price:.2f}" if stop_price else "—",
            f"{limit_price:.2f}" if limit_price and not is_closing else "—",
            signal.confidence,
        )
        return record

    # ── Duplicate guard ───────────────────────────────────────────────

    def has_active_order(self, symbol: str) -> bool:
        return symbol in self._active_symbols

    def _claim_symbol(self, symbol: str) -> None:
        self._active_symbols.add(symbol)

    def _release_symbol(self, symbol: str) -> None:
        self._active_symbols.discard(symbol)

    # ── Bracket order ─────────────────────────────────────────────────

    async def place_bracket_order(
        self,
        signal: Signal,
        quantity: int,
    ) -> Optional[OrderRecord]:
        """
        Place a BUY entry with an attached stop-loss and take-profit.

        Stop-loss  = entry_price * (1 - stop_loss_pct)
        Take-profit = entry_price * (1 + take_profit_pct)

        In DRY_RUN mode: records the intent without touching IBKR.
        """
        if self.has_active_order(signal.symbol):
            logger.info("DUPLICATE GUARD: active order exists for {} — skipping", signal.symbol)
            return None

        price = signal.price
        stop_price = round(price * (1 - settings.stop_loss_pct), 2)
        take_profit_price = round(price * (1 + settings.take_profit_pct), 2)

        if settings.dry_run:
            record = self._dry_run_record(
                signal, quantity, "BRACKET",
                limit_price=take_profit_price,
                stop_price=stop_price,
            )
            self._open_orders[record.order_id] = record
            self._claim_symbol(signal.symbol)
            return record

        await self._ibkr.ensure_connected()
        contract = self._ibkr.stock_contract(signal.symbol)
        qualified = await self._ibkr.qualify_contract(contract)
        if not qualified:
            logger.error("Cannot qualify contract for {} — bracket order aborted", signal.symbol)
            return None

        try:
            # ib_async bracketOrder returns (parent, takeProfit, stopLoss)
            bracket = self._ibkr.ib.bracketOrder(
                action="BUY",
                quantity=quantity,
                limitPrice=round(price * 1.001, 2),  # slight limit above market
                takeProfitPrice=take_profit_price,
                stopLossPrice=stop_price,
            )

            trades = []
            for order in bracket:
                order.tif = "GTC"
                trade: Trade = self._ibkr.ib.placeOrder(qualified, order)
                trades.append(trade)

            parent_trade = trades[0]
            record = OrderRecord(
                order_id=str(uuid.uuid4()),
                ibkr_order_id=parent_trade.order.orderId,
                symbol=signal.symbol,
                action="BUY",
                quantity=quantity,
                order_type="BRACKET",
                limit_price=take_profit_price,
                stop_price=stop_price,
                submitted_at=datetime.utcnow().isoformat(),
                status="SUBMITTED",
                dry_run=False,
                signal_confidence=signal.confidence,
                signal_reasoning=signal.reasoning[:5],
            )
            self._open_orders[record.order_id] = record
            self._claim_symbol(signal.symbol)
            self._log_order(record)
            logger.info(
                "BRACKET ORDER: BUY {} × {} | SL={:.2f} TP={:.2f} (ibkr_id={})",
                quantity, signal.symbol, stop_price, take_profit_price,
                parent_trade.order.orderId,
            )
            return record

        except Exception as exc:
            logger.error("Bracket order failed for {}: {}", signal.symbol, exc)
            return None

    # ── Closing order (position flip / manual close) ───────────────────

    async def place_closing_order(
        self,
        symbol: str,
        quantity: int,
        action: str = "SELL",
    ) -> Optional[OrderRecord]:
        """
        Close an existing position with a market order.
        Used for position flips: long → signal reverses → close first.
        """
        if self.has_active_order(symbol):
            logger.info("DUPLICATE GUARD: active order for {} — close skipped", symbol)
            return None

        # Build a minimal Signal-like object for dry-run logging
        from agent.signals.engine import Signal as Sig, Action
        dummy_signal = Sig(
            symbol=symbol,
            action=Action.SELL if action == "SELL" else Action.BUY,
            confidence=1.0,
            size_multiplier=1.0,
            price=0.0,
            reasoning=["Closing existing position"],
        )

        if settings.dry_run:
            record = self._dry_run_record(
                dummy_signal, quantity, "MKT", is_closing=True
            )
            self._open_orders[record.order_id] = record
            self._claim_symbol(symbol)
            return record

        await self._ibkr.ensure_connected()
        contract = self._ibkr.stock_contract(symbol)
        qualified = await self._ibkr.qualify_contract(contract)
        if not qualified:
            return None

        try:
            order = MarketOrder(action, quantity)
            order.tif = "DAY"
            trade: Trade = self._ibkr.ib.placeOrder(qualified, order)
            record = OrderRecord(
                order_id=str(uuid.uuid4()),
                ibkr_order_id=trade.order.orderId,
                symbol=symbol,
                action=action,
                quantity=quantity,
                order_type="MKT",
                limit_price=None,
                stop_price=None,
                submitted_at=datetime.utcnow().isoformat(),
                status="SUBMITTED",
                is_closing=True,
            )
            self._open_orders[record.order_id] = record
            self._claim_symbol(symbol)
            self._log_order(record)
            logger.info("CLOSE ORDER: {} {} × {} (ibkr_id={})", action, quantity, symbol, trade.order.orderId)
            return record

        except Exception as exc:
            logger.error("Close order failed for {}: {}", symbol, exc)
            return None

    # ── Status sync ───────────────────────────────────────────────────

    async def sync_order_statuses(self) -> None:
        """Pull open trades from IBKR and update local records."""
        if settings.dry_run:
            # In dry-run, immediately mark DRY orders as "filled" after one loop
            for rec in list(self._open_orders.values()):
                if rec.status == "DRY":
                    rec.status = "DRY_FILLED"
                    rec.filled_at = datetime.utcnow().isoformat()
                    self._log_order(rec)
                    self._release_symbol(rec.symbol)
                    del self._open_orders[rec.order_id]
            return

        await self._ibkr.ensure_connected()
        open_trades = self._ibkr.ib.openTrades()
        ibkr_id_to_trade = {t.order.orderId: t for t in open_trades}

        for rec in list(self._open_orders.values()):
            if rec.ibkr_order_id is None:
                continue
            trade = ibkr_id_to_trade.get(rec.ibkr_order_id)
            if trade is None:
                # No longer open → filled or cancelled
                rec.status = "FILLED"
                rec.filled_at = datetime.utcnow().isoformat()
                self._log_order(rec)
                self._release_symbol(rec.symbol)
                del self._open_orders[rec.order_id]
            else:
                new_status = trade.orderStatus.status
                if new_status != rec.status:
                    rec.status = new_status
                    if new_status in ("Filled", "Cancelled"):
                        rec.filled_at = datetime.utcnow().isoformat()
                        rec.fill_price = trade.orderStatus.avgFillPrice or None
                        self._log_order(rec)
                        self._release_symbol(rec.symbol)

    async def cancel_order(self, order_id: str) -> bool:
        record = self._open_orders.get(order_id)
        if not record or record.ibkr_order_id is None:
            return False
        if settings.dry_run:
            record.status = "CANCELLED"
            self._log_order(record)
            self._release_symbol(record.symbol)
            del self._open_orders[order_id]
            return True
        try:
            await self._ibkr.ensure_connected()
            for trade in self._ibkr.ib.openTrades():
                if trade.order.orderId == record.ibkr_order_id:
                    self._ibkr.ib.cancelOrder(trade.order)
                    record.status = "CANCELLED"
                    self._log_order(record)
                    self._release_symbol(record.symbol)
                    logger.info("Cancelled order {} (ibkr_id={})", order_id, record.ibkr_order_id)
                    return True
            return False
        except Exception as exc:
            logger.error("Cancel failed for {}: {}", order_id, exc)
            return False

    async def get_open_orders(self) -> List[OrderRecord]:
        await self.sync_order_statuses()
        return list(self._open_orders.values())

    def load_journal(self) -> List[OrderRecord]:
        records: List[OrderRecord] = []
        if not self.JOURNAL_PATH.exists():
            return records
        with self.JOURNAL_PATH.open() as f:
            for line in f:
                try:
                    d = json.loads(line)
                    records.append(OrderRecord(**d))
                except Exception:
                    pass
        return records
