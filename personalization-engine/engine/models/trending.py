"""
Trending Engine — Wilson Lower Bound + Exponential Time Decay + Velocity Bonus
Wilson score gives a statistically sound lower-bound on the true engagement rate.
Time decay ensures stale content does not block fresh items.
Velocity bonus rewards items gaining momentum right now.
"""
import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


Z_95 = 1.96  # 95% confidence interval


def wilson_lower_bound(positive: int, total: int, z: float = Z_95) -> float:
    """
    Wilson score lower confidence bound for a binomial proportion.
    Returns 0 if total == 0.
    """
    if total == 0:
        return 0.0
    p_hat = positive / total
    denom = 1 + z * z / total
    centre = p_hat + z * z / (2 * total)
    margin = z * math.sqrt(p_hat * (1 - p_hat) / total + z * z / (4 * total * total))
    return (centre - margin) / denom


def time_decay(last_interaction: datetime, half_life_hours: float = 24.0) -> float:
    """Exponential decay: score halves every half_life_hours."""
    hours_ago = (datetime.utcnow() - last_interaction).total_seconds() / 3600.0
    lam = math.log(2) / half_life_hours
    return math.exp(-lam * hours_ago)


@dataclass
class ItemTrendState:
    item_id: str
    views: int = 0
    clicks: int = 0
    purchases: int = 0
    likes: int = 0
    category: str = ""
    last_interaction: Optional[datetime] = None
    # Rolling window for velocity (last 1h, 6h, 24h event counts)
    recent_1h: int = 0
    recent_6h: int = 0
    recent_24h: int = 0

    def positive_signals(self) -> int:
        return self.likes + self.purchases * 5 + self.clicks * 2

    def total_signals(self) -> int:
        return self.views + self.clicks + self.likes + self.purchases

    def wilson_score(self) -> float:
        return wilson_lower_bound(self.positive_signals(), self.total_signals())

    def velocity_score(self) -> float:
        """Momentum: items spiking in the last hour get a bonus."""
        if self.recent_24h == 0:
            return 0.0
        hourly_rate = self.recent_1h / max(self.recent_24h, 1)
        return min(hourly_rate * 3.0, 1.0)

    def trending_score(self, half_life_hours: float = 24.0) -> float:
        if self.last_interaction is None:
            return 0.0
        w = self.wilson_score()
        d = time_decay(self.last_interaction, half_life_hours)
        v = self.velocity_score()
        # Blend: 60% quality, 30% recency, 10% velocity
        return 0.60 * w + 0.30 * d + 0.10 * v


class TrendingEngine:
    """
    Maintains in-memory trend state for all items per tenant.
    Designed to be refreshed from ItemStats DB rows periodically.
    """

    def __init__(self, half_life_hours: float = 24.0):
        self.half_life = half_life_hours
        # {tenant_id: {item_id: ItemTrendState}}
        self._state: Dict[str, Dict[str, ItemTrendState]] = {}

    def upsert(self, tenant_id: str, item_id: str, **kwargs):
        tenant_state = self._state.setdefault(tenant_id, {})
        if item_id not in tenant_state:
            tenant_state[item_id] = ItemTrendState(item_id=item_id)
        state = tenant_state[item_id]
        for k, v in kwargs.items():
            if hasattr(state, k):
                setattr(state, k, v)

    def record_event(
        self,
        tenant_id: str,
        item_id: str,
        event_type: str,
        value: float = 1.0,
        category: str = "",
    ):
        tenant_state = self._state.setdefault(tenant_id, {})
        if item_id not in tenant_state:
            tenant_state[item_id] = ItemTrendState(item_id=item_id, category=category)

        state = tenant_state[item_id]
        state.last_interaction = datetime.utcnow()
        state.category = category or state.category

        if event_type == "view":
            state.views += 1
            state.recent_1h += 1
            state.recent_6h += 1
            state.recent_24h += 1
        elif event_type == "click":
            state.clicks += 1
            state.recent_1h += 2
            state.recent_6h += 2
            state.recent_24h += 2
        elif event_type in ("purchase", "order"):
            state.purchases += 1
            state.revenue = getattr(state, "revenue", 0.0) + value
        elif event_type == "like":
            state.likes += 1

    def top_trending(
        self,
        tenant_id: str,
        top_k: int = 50,
        category: Optional[str] = None,
        exclude_item_ids: Optional[List[str]] = None,
    ) -> List[Tuple[str, float]]:
        tenant_state = self._state.get(tenant_id, {})
        exclude = set(exclude_item_ids or [])
        scored = []
        for item_id, state in tenant_state.items():
            if item_id in exclude:
                continue
            if category and state.category != category:
                continue
            score = state.trending_score(self.half_life)
            if score > 0:
                scored.append((item_id, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def top_popular(
        self,
        tenant_id: str,
        top_k: int = 10,
        exclude_item_ids: Optional[List[str]] = None,
    ) -> List[Tuple[str, float]]:
        """Pure popularity (purchases + views) — for the 'Top 10' surface."""
        tenant_state = self._state.get(tenant_id, {})
        exclude = set(exclude_item_ids or [])
        scored = [
            (item_id, state.total_signals())
            for item_id, state in tenant_state.items()
            if item_id not in exclude
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        # Normalise to [0, 1]
        if scored:
            max_val = scored[0][1] or 1
            scored = [(iid, v / max_val) for iid, v in scored]
        return scored[:top_k]

    def category_trending(
        self,
        tenant_id: str,
        top_k: int = 10,
    ) -> Dict[str, List[Tuple[str, float]]]:
        """Returns trending items grouped by category."""
        tenant_state = self._state.get(tenant_id, {})
        categories: Dict[str, List] = {}
        for item_id, state in tenant_state.items():
            cat = state.category or "uncategorized"
            categories.setdefault(cat, []).append((item_id, state.trending_score(self.half_life)))
        return {
            cat: sorted(items, key=lambda x: x[1], reverse=True)[:top_k]
            for cat, items in categories.items()
        }
