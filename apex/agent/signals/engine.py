"""
APEX.AI — Signal engine.

Combines technical indicators (RSI, MACD, Bollinger Bands, EMA)
with Claude-scored sentiment to produce BUY / SELL / HOLD signals
with a confidence score and size multiplier.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import ta
from loguru import logger

from agent.data.market_data import MarketDataFeed, PriceSnapshot
from agent.sentiment.aggregator import SentimentScore


# ── Enums & data classes ──────────────────────────────────────────────


class Action(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass
class TechnicalIndicators:
    rsi: Optional[float] = None          # 0–100
    macd: Optional[float] = None         # MACD line
    macd_signal: Optional[float] = None  # signal line
    macd_hist: Optional[float] = None    # histogram
    bb_upper: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_mid: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    adx: Optional[float] = None          # trend strength


@dataclass
class Signal:
    symbol: str
    action: Action
    confidence: float                     # 0.0 – 1.0
    size_multiplier: float = 1.0         # scales position size (0.25 – 1.0)
    price: float = 0.0
    reasoning: List[str] = field(default_factory=list)
    indicators: Optional[TechnicalIndicators] = None
    sentiment_score: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


# ── Engine ────────────────────────────────────────────────────────────


class SignalEngine:
    """
    Rules-based signal generator.

    Scoring model (all sub-scores → [-1, +1]):
      technical  : 60% weight
      sentiment  : 40% weight

    An aggregate score >= +0.35 → BUY
    An aggregate score <= -0.35 → SELL
    Otherwise                   → HOLD
    """

    BUY_THRESHOLD = 0.35
    SELL_THRESHOLD = -0.35
    TECHNICAL_WEIGHT = 0.60
    SENTIMENT_WEIGHT = 0.40

    def __init__(self, market_data: MarketDataFeed) -> None:
        self._md = market_data

    # ── Technical analysis ────────────────────────────────────────────

    def _compute_indicators(self, df: pd.DataFrame) -> Optional[TechnicalIndicators]:
        if df.empty or len(df) < 26:
            return None

        close = df["close"]
        high = df["high"]
        low = df["low"]

        try:
            rsi = ta.momentum.RSIIndicator(close, window=14).rsi().iloc[-1]
            macd_obj = ta.trend.MACD(close)
            macd_val = macd_obj.macd().iloc[-1]
            macd_sig = macd_obj.macd_signal().iloc[-1]
            macd_hist = macd_obj.macd_diff().iloc[-1]

            bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
            bb_upper = bb.bollinger_hband().iloc[-1]
            bb_lower = bb.bollinger_lband().iloc[-1]
            bb_mid = bb.bollinger_mavg().iloc[-1]

            ema_20 = ta.trend.EMAIndicator(close, window=20).ema_indicator().iloc[-1]
            ema_50 = ta.trend.EMAIndicator(close, window=50).ema_indicator().iloc[-1]

            adx = ta.trend.ADXIndicator(high, low, close, window=14).adx().iloc[-1]

            return TechnicalIndicators(
                rsi=float(rsi),
                macd=float(macd_val),
                macd_signal=float(macd_sig),
                macd_hist=float(macd_hist),
                bb_upper=float(bb_upper),
                bb_lower=float(bb_lower),
                bb_mid=float(bb_mid),
                ema_20=float(ema_20),
                ema_50=float(ema_50),
                adx=float(adx),
            )
        except Exception as exc:
            logger.warning("Indicator computation failed: {}", exc)
            return None

    def _technical_score(
        self, ind: TechnicalIndicators, snap: PriceSnapshot
    ) -> tuple[float, List[str]]:
        """Return (score: -1..1, reasons: list[str])."""
        score = 0.0
        reasons: List[str] = []

        # RSI: oversold (<30) → bullish; overbought (>70) → bearish
        if ind.rsi is not None:
            if ind.rsi < 30:
                score += 0.30
                reasons.append(f"RSI oversold ({ind.rsi:.1f})")
            elif ind.rsi < 45:
                score += 0.10
                reasons.append(f"RSI weak ({ind.rsi:.1f})")
            elif ind.rsi > 70:
                score -= 0.30
                reasons.append(f"RSI overbought ({ind.rsi:.1f})")
            elif ind.rsi > 55:
                score -= 0.10
                reasons.append(f"RSI elevated ({ind.rsi:.1f})")

        # MACD crossover
        if ind.macd_hist is not None:
            if ind.macd_hist > 0:
                score += min(0.25, ind.macd_hist * 0.05)
                reasons.append(f"MACD bullish crossover (hist={ind.macd_hist:.3f})")
            else:
                score += max(-0.25, ind.macd_hist * 0.05)
                reasons.append(f"MACD bearish crossover (hist={ind.macd_hist:.3f})")

        # Bollinger Band position
        if ind.bb_upper and ind.bb_lower and snap.last > 0:
            bb_range = ind.bb_upper - ind.bb_lower
            if bb_range > 0:
                bb_pos = (snap.last - ind.bb_lower) / bb_range  # 0=at lower, 1=at upper
                if bb_pos < 0.20:
                    score += 0.20
                    reasons.append("Price near BB lower band (mean reversion signal)")
                elif bb_pos > 0.80:
                    score -= 0.20
                    reasons.append("Price near BB upper band (mean reversion signal)")

        # EMA trend
        if ind.ema_20 and ind.ema_50:
            if ind.ema_20 > ind.ema_50:
                score += 0.15
                reasons.append("EMA 20 > EMA 50 (uptrend)")
            else:
                score -= 0.15
                reasons.append("EMA 20 < EMA 50 (downtrend)")

        # ADX trend strength — reduces confidence when market is ranging
        if ind.adx is not None and ind.adx < 20:
            score *= 0.6  # weaken signal in low-trend environment
            reasons.append(f"Weak trend (ADX={ind.adx:.1f}) — signal dampened")

        return float(np.clip(score, -1.0, 1.0)), reasons

    # ── Signal generation ─────────────────────────────────────────────

    async def generate_signal(
        self,
        symbol: str,
        snap: PriceSnapshot,
        sentiment: SentimentScore,
        bars: Optional[pd.DataFrame] = None,
    ) -> Signal:
        """
        Generate a BUY / SELL / HOLD signal for *symbol*.

        If *bars* is None, requests hourly bars from the market data feed.
        """
        if bars is None:
            bars = await self._md.get_bars(symbol, bar_size="1h", lookback_days=30)

        ind = self._compute_indicators(bars)

        tech_score = 0.0
        tech_reasons: List[str] = []

        if ind:
            tech_score, tech_reasons = self._technical_score(ind, snap)
        else:
            tech_reasons.append("Insufficient data for technical analysis")

        # Sentiment sub-score (already in -1..1)
        sent_score = sentiment.score * min(1.0, sentiment.confidence / 0.6)

        # Weighted aggregate
        agg = (self.TECHNICAL_WEIGHT * tech_score) + (self.SENTIMENT_WEIGHT * sent_score)
        agg = float(np.clip(agg, -1.0, 1.0))

        # Determine action
        if agg >= self.BUY_THRESHOLD:
            action = Action.BUY
        elif agg <= self.SELL_THRESHOLD:
            action = Action.SELL
        else:
            action = Action.HOLD

        # Confidence = abs aggregate score mapped to 0..1
        confidence = float(np.clip(abs(agg) / 1.0, 0.0, 1.0))

        # Size multiplier: stronger signals get larger allocations
        size_mult = float(np.clip(abs(agg), 0.25, 1.0))

        all_reasons = tech_reasons + [
            f"Sentiment: {sentiment.label} (score={sentiment.score:.2f}, conf={sentiment.confidence:.2f})",
            f"Sentiment summary: {sentiment.summary}",
        ]

        sig = Signal(
            symbol=symbol,
            action=action,
            confidence=confidence,
            size_multiplier=size_mult,
            price=snap.last,
            reasoning=all_reasons,
            indicators=ind,
            sentiment_score=sentiment.score,
        )
        logger.info(
            "Signal {} | {} | conf={:.2f} | tech={:.3f} sent={:.3f} agg={:.3f}",
            symbol, action.value, confidence, tech_score, sent_score, agg,
        )
        return sig

    async def generate_all(
        self,
        snapshots: Dict[str, PriceSnapshot],
        sentiments: Dict[str, SentimentScore],
    ) -> Dict[str, Signal]:
        """Generate signals for all symbols."""
        results: Dict[str, Signal] = {}
        for sym, snap in snapshots.items():
            sentiment = sentiments.get(sym)
            if sentiment is None:
                from agent.sentiment.aggregator import SentimentScore as SS
                sentiment = SS(sym, 0.0, 0.0, "No sentiment data")
            results[sym] = await self.generate_signal(sym, snap, sentiment)
        return results
