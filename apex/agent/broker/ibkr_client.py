"""
APEX.AI — IBKR connection wrapper built on ib_insync.

Handles connect/reconnect, account summary, positions, and
creates contract objects used by OrderManager.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from ib_insync import IB, Contract, Position, Stock, AccountValue
from loguru import logger

from agent.config import settings


@dataclass
class AccountSummary:
    net_liquidation: float = 0.0
    available_funds: float = 0.0
    buying_power: float = 0.0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    currency: str = "AED"
    raw: Dict[str, str] = field(default_factory=dict)


@dataclass
class PortfolioPosition:
    symbol: str
    quantity: float
    avg_cost: float
    market_price: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float


class IBKRClient:
    """Thin async wrapper around ib_insync.IB."""

    def __init__(self) -> None:
        self.ib = IB()
        self._connected = False

    # ── Connection ────────────────────────────────────────────────────

    async def connect(self) -> None:
        """Connect to TWS / IB Gateway with automatic retry."""
        for attempt in range(1, 6):
            try:
                await self.ib.connectAsync(
                    host=settings.ibkr_host,
                    port=settings.ibkr_port,
                    clientId=settings.ibkr_client_id,
                    timeout=20,
                )
                self._connected = True
                logger.info(
                    "Connected to IBKR {}:{} (clientId={})",
                    settings.ibkr_host,
                    settings.ibkr_port,
                    settings.ibkr_client_id,
                )
                return
            except Exception as exc:
                wait = 2 ** attempt
                logger.warning(
                    "IBKR connect attempt {}/5 failed: {}. Retrying in {}s…",
                    attempt, exc, wait,
                )
                await asyncio.sleep(wait)
        raise ConnectionError("Failed to connect to IBKR after 5 attempts")

    async def disconnect(self) -> None:
        if self._connected:
            self.ib.disconnect()
            self._connected = False
            logger.info("Disconnected from IBKR")

    async def ensure_connected(self) -> None:
        if not self.ib.isConnected():
            logger.warning("IBKR connection lost — reconnecting…")
            self._connected = False
            await self.connect()

    # ── Contracts ─────────────────────────────────────────────────────

    def stock_contract(self, symbol: str, exchange: str = "SMART", currency: str = "USD") -> Stock:
        """Return a qualified Stock contract."""
        return Stock(symbol, exchange, currency)

    async def qualify_contract(self, contract: Contract) -> Optional[Contract]:
        """Qualify a contract (resolves ambiguity, fills conId)."""
        contracts = await self.ib.qualifyContractsAsync(contract)
        if not contracts:
            logger.warning("Could not qualify contract for {}", contract.symbol)
            return None
        return contracts[0]

    # ── Account ───────────────────────────────────────────────────────

    async def get_account_summary(self) -> AccountSummary:
        """Fetch account-level metrics from IBKR."""
        await self.ensure_connected()
        values: List[AccountValue] = await self.ib.accountSummaryAsync()

        raw: Dict[str, str] = {v.tag: v.value for v in values if v.currency in ("", settings.account_currency, "USD")}

        def _float(tag: str) -> float:
            try:
                return float(raw.get(tag, 0.0))
            except ValueError:
                return 0.0

        return AccountSummary(
            net_liquidation=_float("NetLiquidation"),
            available_funds=_float("AvailableFunds"),
            buying_power=_float("BuyingPower"),
            realized_pnl=_float("RealizedPnL"),
            unrealized_pnl=_float("UnrealizedPnL"),
            currency=settings.account_currency,
            raw=raw,
        )

    async def get_portfolio_value(self) -> float:
        summary = await self.get_account_summary()
        return summary.net_liquidation

    # ── Positions ─────────────────────────────────────────────────────

    async def get_positions(self) -> List[PortfolioPosition]:
        """Return all open positions."""
        await self.ensure_connected()
        raw_positions: List[Position] = await self.ib.reqPositionsAsync()

        result = []
        for pos in raw_positions:
            if pos.position == 0:
                continue
            ticker = await self.ib.reqTickersAsync(pos.contract)
            price = ticker[0].marketPrice() if ticker else 0.0
            result.append(
                PortfolioPosition(
                    symbol=pos.contract.symbol,
                    quantity=pos.position,
                    avg_cost=pos.avgCost,
                    market_price=price,
                    market_value=price * pos.position,
                    unrealized_pnl=(price - pos.avgCost) * pos.position,
                    realized_pnl=0.0,
                )
            )
        return result

    # ── Market data helpers ───────────────────────────────────────────

    async def get_current_price(self, symbol: str) -> Optional[float]:
        """Quick snapshot of last price for a symbol."""
        await self.ensure_connected()
        contract = self.stock_contract(symbol)
        qualified = await self.qualify_contract(contract)
        if not qualified:
            return None
        tickers = await self.ib.reqTickersAsync(qualified)
        if not tickers:
            return None
        price = tickers[0].last or tickers[0].close
        return float(price) if price and price > 0 else None
