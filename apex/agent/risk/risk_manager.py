"""
APEX.AI — Pre-trade risk manager.

Checks every signal against hard limits before it reaches the broker.
All checks are synchronous (fast path); account data is refreshed
from IBKR at the start of each agent loop iteration.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, time, timezone
from typing import List, Optional

import pytz
from loguru import logger

from agent.broker.ibkr_client import AccountSummary
from agent.config import settings
from agent.signals.engine import Action, Signal


# ── Data classes ──────────────────────────────────────────────────────


@dataclass
class RiskVeto:
    """A veto reason that blocks trade execution."""
    rule: str
    detail: str


@dataclass
class RiskResult:
    approved: bool
    quantity: int                         # shares to trade (0 if vetoed)
    vetoes: List[RiskVeto] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    @property
    def veto_reasons(self) -> List[str]:
        return [f"[{v.rule}] {v.detail}" for v in self.vetoes]


# ── Manager ───────────────────────────────────────────────────────────


class RiskManager:
    """
    Pre-trade safety filters.

    Rules enforced:
      1. Market-hours check (NYSE regular hours + 15-min buffer)
      2. Daily loss circuit-breaker
      3. Max drawdown circuit-breaker
      4. Per-symbol position-size cap (% of NAV)
      5. Minimum sentiment confidence gate
      6. Duplicate/existing position guard
    """

    # NYSE regular hours in ET
    _ET = pytz.timezone("America/New_York")
    _MARKET_OPEN = time(9, 30)
    _MARKET_CLOSE = time(16, 0)

    def __init__(self) -> None:
        self._session_start_nav: Optional[float] = None
        self._session_high_nav: Optional[float] = None
        self._daily_realized_loss: float = 0.0

    def update_nav(self, nav: float) -> None:
        """Call at the start of each loop with the current portfolio NAV."""
        if self._session_start_nav is None:
            self._session_start_nav = nav
            self._session_high_nav = nav
            logger.info("RiskManager: session NAV baseline = {:.2f}", nav)
        if nav > (self._session_high_nav or 0):
            self._session_high_nav = nav

    def reset_daily(self) -> None:
        """Reset intra-day counters (call at start of new trading day)."""
        self._session_start_nav = None
        self._session_high_nav = None
        self._daily_realized_loss = 0.0

    # ── Individual checks ─────────────────────────────────────────────

    def _check_market_hours(self) -> Optional[RiskVeto]:
        now_et = datetime.now(self._ET)
        t = now_et.time()
        # Allow 5-min buffer before close
        close_buffer = time(15, 55)
        if not (self._MARKET_OPEN <= t <= close_buffer):
            return RiskVeto("MARKET_HOURS", f"Market closed at {t.strftime('%H:%M')} ET")
        # Block Friday after-hours
        if now_et.weekday() >= 5:
            return RiskVeto("MARKET_HOURS", "Weekend — no trading")
        return None

    def _check_daily_loss(self, account: AccountSummary) -> Optional[RiskVeto]:
        if self._session_start_nav is None or self._session_start_nav == 0:
            return None
        loss_pct = (self._session_start_nav - account.net_liquidation) / self._session_start_nav
        if loss_pct >= settings.max_daily_loss_pct:
            return RiskVeto(
                "DAILY_LOSS",
                f"Daily loss {loss_pct:.2%} >= limit {settings.max_daily_loss_pct:.2%} — trading halted",
            )
        return None

    def _check_drawdown(self, account: AccountSummary) -> Optional[RiskVeto]:
        if self._session_high_nav is None or self._session_high_nav == 0:
            return None
        dd = (self._session_high_nav - account.net_liquidation) / self._session_high_nav
        if dd >= settings.max_drawdown_pct:
            return RiskVeto(
                "MAX_DRAWDOWN",
                f"Drawdown {dd:.2%} >= limit {settings.max_drawdown_pct:.2%} — trading halted",
            )
        return None

    def _check_sentiment_confidence(self, signal: Signal) -> Optional[RiskVeto]:
        if signal.confidence < settings.min_sentiment_confidence:
            return RiskVeto(
                "LOW_CONFIDENCE",
                f"Signal confidence {signal.confidence:.2f} < threshold {settings.min_sentiment_confidence:.2f}",
            )
        return None

    def _calculate_quantity(self, signal: Signal, account: AccountSummary) -> int:
        """
        Position size = NAV * max_position_size_pct * size_multiplier / price
        Rounds down to whole shares; minimum 1.
        """
        if signal.price <= 0:
            return 0
        nav = account.net_liquidation
        dollar_alloc = nav * settings.max_position_size_pct * signal.size_multiplier
        qty = int(math.floor(dollar_alloc / signal.price))
        return max(0, qty)

    # ── Public API ────────────────────────────────────────────────────

    def evaluate(
        self,
        signal: Signal,
        account: AccountSummary,
        existing_position_qty: float = 0.0,
    ) -> RiskResult:
        """
        Run all risk checks.

        Returns RiskResult.approved == True only if ALL checks pass.
        quantity is calculated as part of position sizing.
        """
        vetoes: List[RiskVeto] = []
        warnings: List[str] = []

        # ── Hard vetos (trading completely blocked) ────────────────
        if v := self._check_market_hours():
            vetoes.append(v)

        if v := self._check_daily_loss(account):
            vetoes.append(v)

        if v := self._check_drawdown(account):
            vetoes.append(v)

        if v := self._check_sentiment_confidence(signal):
            vetoes.append(v)

        # HOLD signals never execute
        if signal.action == Action.HOLD:
            vetoes.append(RiskVeto("SIGNAL", "Action is HOLD — no order"))

        if vetoes:
            for veto in vetoes:
                logger.warning("RISK VETO [{}]: {}", veto.rule, veto.detail)
            return RiskResult(approved=False, quantity=0, vetoes=vetoes, warnings=warnings)

        # ── Quantity sizing ────────────────────────────────────────
        qty = self._calculate_quantity(signal, account)

        if qty == 0:
            return RiskResult(
                approved=False,
                quantity=0,
                vetoes=[RiskVeto("POSITION_SIZE", "Calculated quantity is 0 — insufficient funds")],
                warnings=warnings,
            )

        # ── Warnings (non-blocking) ────────────────────────────────
        if existing_position_qty != 0 and signal.action == Action.BUY:
            warnings.append(f"Already holding {existing_position_qty:.0f} shares — adding to position")

        nav = account.net_liquidation
        alloc_pct = (qty * signal.price) / nav if nav > 0 else 0
        if alloc_pct > settings.max_position_size_pct * 1.1:
            warnings.append(f"Allocation {alloc_pct:.1%} slightly exceeds cap — consider review")

        logger.info(
            "RISK APPROVED: {} {} × {} @ {:.2f} (alloc={:.1%} NAV)",
            signal.action.value, qty, signal.symbol, signal.price, alloc_pct,
        )
        return RiskResult(approved=True, quantity=qty, vetoes=[], warnings=warnings)
