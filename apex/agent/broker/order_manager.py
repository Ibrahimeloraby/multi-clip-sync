"""
APEX.AI — Order execution and tracking.

Wraps ib_insync order placement with logging, status tracking,
and a local trade journal (JSONL file).
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ib_insync import LimitOrder, MarketOrder, Order, Trade
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
    action: str             # "BUY" | "SELL"
    quantity: int
    order_type: str         # "MKT" | "LMT"
    limit_price: Optional[float]
    submitted_at: str
    filled_at: Optional[str] = None
    fill_price: Optional[float] = None
    status: str = "SUBMITTED"
    signal_confidence: float = 0.0
    signal_reasoning: List[str] = field(default_factory=list)


# ── Manager ───────────────────────────────────────────────────────────


class OrderManager:
    """
    Executes orders through IBKR and maintains a local trade journal.

    Journal is written to apex/trades.jsonl for audit purposes.
    """

    JOURNAL_PATH = Path(__file__).parent.parent.parent / "trades.jsonl"

    def __init__(self, ibkr: IBKRClient) -> None:
        self._ibkr = ibkr
        self._open_orders: Dict[str, OrderRecord] = {}
        self.JOURNAL_PATH.parent.mkdir(parents=True, exist_ok=True)

    # ── Internal helpers ──────────────────────────────────────────────

    def _log_order(self, record: OrderRecord) -> None:
        """Append order record to JSONL journal."""
        try:
            with self.JOURNAL_PATH.open("a") as f:
                f.write(json.dumps(asdict(record)) + "\n")
        except Exception as exc:
            logger.error("Failed to write trade journal: {}", exc)

    def _make_ib_order(
        self,
        action: str,
        quantity: int,
        order_type: str = "MKT",
        limit_price: Optional[float] = None,
    ) -> Order:
        if order_type == "MKT":
            order = MarketOrder(action, quantity)
        else:
            if limit_price is None:
                raise ValueError("limit_price required for LMT order")
            order = LimitOrder(action, quantity, limit_price)
        order.tif = "DAY"
        return order

    # ── Public API ────────────────────────────────────────────────────

    async def place_order(
        self,
        signal: Signal,
        quantity: int,
        order_type: str = "MKT",
        limit_price: Optional[float] = None,
    ) -> Optional[OrderRecord]:
        """
        Submit an order to IBKR.

        Returns an OrderRecord on submission, None on failure.
        Uses market orders by default; pass order_type='LMT' for limit.
        """
        await self._ibkr.ensure_connected()

        action = signal.action.value  # "BUY" | "SELL"
        contract = self._ibkr.stock_contract(signal.symbol)
        qualified = await self._ibkr.qualify_contract(contract)
        if not qualified:
            logger.error("Cannot qualify contract for {} — order aborted", signal.symbol)
            return None

        ib_order = self._make_ib_order(action, quantity, order_type, limit_price)

        try:
            trade: Trade = self._ibkr.ib.placeOrder(qualified, ib_order)
            record = OrderRecord(
                order_id=str(uuid.uuid4()),
                ibkr_order_id=trade.order.orderId,
                symbol=signal.symbol,
                action=action,
                quantity=quantity,
                order_type=order_type,
                limit_price=limit_price,
                submitted_at=datetime.utcnow().isoformat(),
                status="SUBMITTED",
                signal_confidence=signal.confidence,
                signal_reasoning=signal.reasoning[:5],
            )
            self._open_orders[record.order_id] = record
            self._log_order(record)
            logger.info(
                "ORDER SUBMITTED: {} {} × {} @ {} (ibkr_id={})",
                action, quantity, signal.symbol,
                f"${limit_price:.2f}" if limit_price else "MARKET",
                trade.order.orderId,
            )
            return record

        except Exception as exc:
            logger.error("Order placement failed for {}: {}", signal.symbol, exc)
            return None

    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an open order by our internal order_id."""
        record = self._open_orders.get(order_id)
        if not record or record.ibkr_order_id is None:
            return False
        try:
            await self._ibkr.ensure_connected()
            open_trades = self._ibkr.ib.openTrades()
            for trade in open_trades:
                if trade.order.orderId == record.ibkr_order_id:
                    self._ibkr.ib.cancelOrder(trade.order)
                    record.status = "CANCELLED"
                    self._log_order(record)
                    logger.info("Cancelled order {} (ibkr_id={})", order_id, record.ibkr_order_id)
                    return True
            return False
        except Exception as exc:
            logger.error("Cancel failed for {}: {}", order_id, exc)
            return False

    async def sync_order_statuses(self) -> None:
        """Pull open trades from IBKR and update local records."""
        await self._ibkr.ensure_connected()
        open_trades = self._ibkr.ib.openTrades()
        ibkr_id_to_trade = {t.order.orderId: t for t in open_trades}

        for rec in list(self._open_orders.values()):
            if rec.ibkr_order_id is None:
                continue
            trade = ibkr_id_to_trade.get(rec.ibkr_order_id)
            if trade is None:
                # Order no longer open — likely filled or cancelled
                rec.status = "FILLED"
                rec.filled_at = datetime.utcnow().isoformat()
                self._log_order(rec)
                del self._open_orders[rec.order_id]
            else:
                new_status = trade.orderStatus.status
                if new_status != rec.status:
                    rec.status = new_status
                    if new_status in ("Filled", "Cancelled"):
                        rec.filled_at = datetime.utcnow().isoformat()
                        rec.fill_price = trade.orderStatus.avgFillPrice or None
                        self._log_order(rec)

    async def get_open_orders(self) -> List[OrderRecord]:
        await self.sync_order_statuses()
        return list(self._open_orders.values())

    def load_journal(self) -> List[OrderRecord]:
        """Read all past trades from the JSONL journal."""
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
