"""
APEX.AI — Real-time and historical market data via IBKR.

MarketDataFeed wraps ib_insync historical data requests and
streaming tickers, exposing pandas DataFrames ready for TA.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import pandas as pd
from ib_insync import IB, BarData
from loguru import logger

from agent.broker.ibkr_client import IBKRClient


@dataclass
class PriceSnapshot:
    symbol: str
    timestamp: datetime
    last: float
    bid: float
    ask: float
    volume: float
    open: float
    high: float
    low: float
    close: float
    vwap: float = 0.0

    @property
    def spread(self) -> float:
        return self.ask - self.bid

    @property
    def mid(self) -> float:
        return (self.bid + self.ask) / 2 if self.bid and self.ask else self.last


class MarketDataFeed:
    """
    Provides price snapshots and historical OHLCV bars.

    Uses ib_insync reqHistoricalDataAsync for bars and
    reqTickersAsync for real-time quotes.
    """

    # Bar sizes supported by IBKR
    BAR_SIZES = {
        "1m": "1 min",
        "5m": "5 mins",
        "15m": "15 mins",
        "1h": "1 hour",
        "1d": "1 day",
    }

    def __init__(self, ibkr: IBKRClient) -> None:
        self._ibkr = ibkr
        self._cache: Dict[str, PriceSnapshot] = {}

    # ── Snapshot ─────────────────────────────────────────────────────

    async def get_snapshot(self, symbol: str) -> Optional[PriceSnapshot]:
        """Return a real-time price snapshot for *symbol*."""
        try:
            await self._ibkr.ensure_connected()
            contract = self._ibkr.stock_contract(symbol)
            qualified = await self._ibkr.qualify_contract(contract)
            if not qualified:
                return self._cache.get(symbol)

            tickers = await self._ibkr.ib.reqTickersAsync(qualified)
            if not tickers:
                return self._cache.get(symbol)

            t = tickers[0]
            snap = PriceSnapshot(
                symbol=symbol,
                timestamp=datetime.utcnow(),
                last=float(t.last or t.close or 0),
                bid=float(t.bid or 0),
                ask=float(t.ask or 0),
                volume=float(t.volume or 0),
                open=float(t.open or 0),
                high=float(t.high or 0),
                low=float(t.low or 0),
                close=float(t.close or 0),
                vwap=float(t.vwap or 0),
            )
            self._cache[symbol] = snap
            return snap

        except Exception as exc:
            logger.error("get_snapshot({}) failed: {}", symbol, exc)
            return self._cache.get(symbol)

    # ── Historical bars ───────────────────────────────────────────────

    async def get_bars(
        self,
        symbol: str,
        bar_size: str = "1h",
        lookback_days: int = 30,
    ) -> pd.DataFrame:
        """
        Return a DataFrame with columns [open, high, low, close, volume]
        indexed by datetime (UTC).

        bar_size: one of '1m', '5m', '15m', '1h', '1d'
        """
        try:
            await self._ibkr.ensure_connected()
            contract = self._ibkr.stock_contract(symbol)
            qualified = await self._ibkr.qualify_contract(contract)
            if not qualified:
                return pd.DataFrame()

            ib_bar_size = self.BAR_SIZES.get(bar_size, "1 hour")
            duration = f"{lookback_days} D"

            bars: List[BarData] = await self._ibkr.ib.reqHistoricalDataAsync(
                qualified,
                endDateTime="",
                durationStr=duration,
                barSizeSetting=ib_bar_size,
                whatToShow="TRADES",
                useRTH=True,
                formatDate=1,
            )

            if not bars:
                logger.warning("No bars returned for {} ({})", symbol, bar_size)
                return pd.DataFrame()

            df = pd.DataFrame(
                {
                    "open": [b.open for b in bars],
                    "high": [b.high for b in bars],
                    "low": [b.low for b in bars],
                    "close": [b.close for b in bars],
                    "volume": [b.volume for b in bars],
                },
                index=pd.to_datetime([b.date for b in bars], utc=True),
            )
            df.sort_index(inplace=True)
            return df

        except Exception as exc:
            logger.error("get_bars({}, {}) failed: {}", symbol, bar_size, exc)
            return pd.DataFrame()

    # ── Bulk snapshot ─────────────────────────────────────────────────

    async def get_all_snapshots(self, symbols: List[str]) -> Dict[str, PriceSnapshot]:
        """Fetch snapshots for all symbols concurrently."""
        tasks = [self.get_snapshot(s) for s in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        out: Dict[str, PriceSnapshot] = {}
        for sym, res in zip(symbols, results):
            if isinstance(res, PriceSnapshot):
                out[sym] = res
        return out
