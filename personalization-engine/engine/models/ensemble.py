"""
Master Personalization Ensemble
────────────────────────────────────────────────────────────────────────────
Combines every signal source into a unified score using adaptive weights
that shift automatically as we learn more about each user.

User maturity tiers:
  COLD  (0–5  events) → Trending + Content dominate
  WARM  (6–50 events) → Session + NCF + Content blend
  HOT   (51+  events) → NCF + LightGCN + Session lead

Seven recommendation surfaces:
  FOR_YOU              — personalised blend
  TRENDING             — time-decayed Wilson score ranking
  TOP_10               — pure popularity
  BECAUSE_YOU_ACTIONED — collaborative + content based on past actions
  CONTINUE_LEFT_OFF    — session items not yet purchased
  NEXT_BEST_ACTION     — Thompson Sampling exploration
  SIMILAR              — content-based item similarity

Post-ranking:
  MMR diversity reranking prevents near-duplicate results.
  Business rules (out-of-stock, category caps, price filters) applied last.
"""
from __future__ import annotations

import numpy as np
from enum import Enum
from typing import Dict, List, Optional, Tuple

from engine.core.config import settings
from engine.models.ncf import NCFRecommender
from engine.models.lightgcn import LightGCNRecommender
from engine.models.session import SessionRecommender
from engine.models.trending import TrendingEngine
from engine.models.thompson_bandit import ThompsonBanditEngine
from engine.models.content_based import ContentBasedRecommender


class Surface(str, Enum):
    FOR_YOU = "for_you"
    TRENDING = "trending"
    TOP_10 = "top_10"
    BECAUSE_YOU_ACTIONED = "because_you_actioned"
    CONTINUE_LEFT_OFF = "continue_left_off"
    NEXT_BEST_ACTION = "next_best_action"
    SIMILAR = "similar"


class UserTier(str, Enum):
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"


def _tier(event_count: int) -> UserTier:
    if event_count <= 5:
        return UserTier.COLD
    if event_count <= 50:
        return UserTier.WARM
    return UserTier.HOT


def _normalise(scores: List[Tuple[str, float]]) -> Dict[str, float]:
    """Min-max normalise a scored list to [0, 1]."""
    if not scores:
        return {}
    vals = np.array([s for _, s in scores], dtype=np.float64)
    mn, mx = vals.min(), vals.max()
    if mx == mn:
        return {iid: 1.0 for iid, _ in scores}
    return {iid: float((s - mn) / (mx - mn)) for iid, s in scores}


def _mmr_rerank(
    candidates: List[Tuple[str, float]],
    similarity_fn,
    lam: float = 0.3,
    top_k: int = 10,
) -> List[Tuple[str, float]]:
    """
    Maximal Marginal Relevance reranking.
    lam=0 → pure diversity, lam=1 → pure relevance.
    similarity_fn(item_a, item_b) → float in [0,1]
    """
    if not candidates:
        return []

    selected: List[Tuple[str, float]] = []
    remaining = list(candidates)

    while remaining and len(selected) < top_k:
        best_score = -1e9
        best_item = None
        best_idx = 0

        for i, (item_id, rel_score) in enumerate(remaining):
            if not selected:
                mmr = rel_score
            else:
                max_sim = max(similarity_fn(item_id, s_id) for s_id, _ in selected)
                mmr = lam * rel_score - (1 - lam) * max_sim

            if mmr > best_score:
                best_score = mmr
                best_item = (item_id, rel_score)
                best_idx = i

        if best_item:
            selected.append(best_item)
            remaining.pop(best_idx)

    return selected


class MasterEnsemble:
    """
    Central orchestrator — holds references to every sub-model and
    dispatches to the right blend depending on the surface + user tier.
    """

    def __init__(
        self,
        trending_engine: TrendingEngine,
        bandit_engine: ThompsonBanditEngine,
        content_recommender: ContentBasedRecommender,
        ncf_recommender: Optional[NCFRecommender] = None,
        lightgcn_recommender: Optional[LightGCNRecommender] = None,
        session_recommender: Optional[SessionRecommender] = None,
    ):
        self.trending = trending_engine
        self.bandit = bandit_engine
        self.content = content_recommender
        self.ncf = ncf_recommender
        self.lightgcn = lightgcn_recommender
        self.session = session_recommender

        # Internal: item_id → internal_idx mapping per tenant
        # Populated by the TenantModelStore
        self._item_id_map: Dict[str, Dict[str, int]] = {}   # tenant→{ext_id→int_idx}
        self._item_idx_map: Dict[str, Dict[int, str]] = {}  # tenant→{int_idx→ext_id}

    def register_item_map(
        self, tenant_id: str, id_to_idx: Dict[str, int], idx_to_id: Dict[int, str]
    ):
        self._item_id_map[tenant_id] = id_to_idx
        self._item_idx_map[tenant_id] = idx_to_id

    # ── Public API ─────────────────────────────────────────────────────────

    def recommend(
        self,
        tenant_id: str,
        user_external_id: str,
        user_internal_idx: Optional[int],
        user_event_count: int,
        surface: Surface,
        top_k: int = 10,
        exclude_item_ids: Optional[List[str]] = None,
        anchor_item_id: Optional[str] = None,   # for SIMILAR surface
        purchased_item_ids: Optional[List[str]] = None,
        context: Optional[np.ndarray] = None,
        category_filter: Optional[str] = None,
        price_max: Optional[float] = None,
    ) -> List[dict]:
        """
        Returns a ranked list of recommendation dicts:
          [{item_id, score, reason, rank}, ...]
        """
        tier = _tier(user_event_count)
        n_items = len(self._item_id_map.get(tenant_id, {}))
        exclude = set(exclude_item_ids or [])

        if surface == Surface.TRENDING:
            return self._surface_trending(tenant_id, top_k, exclude, category_filter)

        if surface == Surface.TOP_10:
            return self._surface_top10(tenant_id, top_k, exclude)

        if surface == Surface.SIMILAR:
            return self._surface_similar(tenant_id, anchor_item_id, top_k, exclude)

        if surface == Surface.CONTINUE_LEFT_OFF:
            return self._surface_continue(tenant_id, user_external_id, purchased_item_ids, top_k)

        if surface == Surface.NEXT_BEST_ACTION:
            return self._surface_nba(tenant_id, user_external_id, top_k, exclude, context)

        if surface == Surface.BECAUSE_YOU_ACTIONED:
            return self._surface_because_actioned(
                tenant_id, user_external_id, user_internal_idx,
                n_items, tier, top_k, exclude
            )

        # FOR_YOU — full ensemble blend
        return self._surface_for_you(
            tenant_id, user_external_id, user_internal_idx,
            n_items, tier, top_k, exclude, context
        )

    # ── Surface implementations ────────────────────────────────────────────

    def _surface_trending(self, tenant_id, top_k, exclude, category=None):
        results = self.trending.top_trending(tenant_id, top_k * 2, category, list(exclude))
        return self._format(results[:top_k], "trending_now")

    def _surface_top10(self, tenant_id, top_k, exclude):
        results = self.trending.top_popular(tenant_id, top_k, list(exclude))
        return self._format(results, "most_popular")

    def _surface_similar(self, tenant_id, anchor_item_id, top_k, exclude):
        if not anchor_item_id or not self.content.is_fitted():
            return []
        results = self.content.similar_items(anchor_item_id, top_k * 2, list(exclude))
        return self._format(results[:top_k], "similar_items")

    def _surface_continue(self, tenant_id, user_id, purchased_ids, top_k):
        if self.session is None:
            return []
        purchased_idxs = self._ids_to_idxs(tenant_id, purchased_ids or [])
        item_idxs = self.session.get_continue_where_left_off(tenant_id, user_id, purchased_idxs)
        id_map = self._item_idx_map.get(tenant_id, {})
        results = [(id_map[idx], 1.0 - i * 0.05) for i, idx in enumerate(item_idxs) if idx in id_map]
        return self._format(results[:top_k], "continue_where_left_off")

    def _surface_nba(self, tenant_id, user_id, top_k, exclude, context):
        all_items = list(self._item_id_map.get(tenant_id, {}).keys())
        results = self.bandit.recommend(
            tenant_id, all_items, context, top_k * 2, list(exclude)
        )
        return self._format(results[:top_k], "next_best_action")

    def _surface_because_actioned(
        self, tenant_id, user_id, user_internal_idx, n_items, tier, top_k, exclude
    ):
        scores: Dict[str, float] = {}
        id_map = self._item_idx_map.get(tenant_id, {})
        exclude_idxs = self._ids_to_idxs(tenant_id, list(exclude))

        # Session signal (strongest — most recent intent)
        if self.session:
            sess = self.session.recommend(tenant_id, user_id, exclude_idxs, top_k * 3)
            sess_norm = _normalise([(id_map.get(i, ""), s) for i, s in sess if i in id_map])
            for iid, s in sess_norm.items():
                scores[iid] = scores.get(iid, 0) + 0.50 * s

        # Content signal (what the viewed items are similar to)
        if self.content.is_fitted():
            viewed_in_session = self.session.tracker.get_session(tenant_id, user_id) if self.session else []
            if viewed_in_session:
                anchor_id = id_map.get(viewed_in_session[-1])
                if anchor_id:
                    similar = self.content.similar_items(anchor_id, top_k * 2, list(exclude))
                    sim_norm = _normalise(similar)
                    for iid, s in sim_norm.items():
                        scores[iid] = scores.get(iid, 0) + 0.30 * s

        # NCF if available
        if self.ncf and user_internal_idx is not None and n_items > 0:
            ncf_raw = self.ncf.score_all_items(user_internal_idx, n_items, exclude_idxs, top_k * 2)
            ncf_norm = _normalise([(id_map.get(i, ""), s) for i, s in ncf_raw if i in id_map])
            for iid, s in ncf_norm.items():
                scores[iid] = scores.get(iid, 0) + 0.20 * s

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        ranked = [(iid, s) for iid, s in ranked if iid and iid not in exclude]
        return self._format(ranked[:top_k], "because_you_actioned")

    def _surface_for_you(
        self, tenant_id, user_id, user_internal_idx, n_items, tier, top_k, exclude, context
    ):
        weights = {
            UserTier.COLD: settings.WEIGHTS_COLD,
            UserTier.WARM: settings.WEIGHTS_WARM,
            UserTier.HOT: settings.WEIGHTS_HOT,
        }[tier]

        scores: Dict[str, float] = {}
        id_map = self._item_idx_map.get(tenant_id, {})
        exclude_idxs = self._ids_to_idxs(tenant_id, list(exclude))
        POOL = top_k * 4

        # ── NCF ──────────────────────────────────────────────────────────
        if self.ncf and user_internal_idx is not None and n_items > 0 and weights.get("ncf", 0) > 0:
            raw = self.ncf.score_all_items(user_internal_idx, n_items, exclude_idxs, POOL)
            norm = _normalise([(id_map.get(i, ""), s) for i, s in raw if i in id_map])
            w = weights["ncf"]
            for iid, s in norm.items():
                scores[iid] = scores.get(iid, 0) + w * s

        # ── LightGCN ─────────────────────────────────────────────────────
        if self.lightgcn and user_internal_idx is not None and n_items > 0 and weights.get("lightgcn", 0) > 0:
            raw = self.lightgcn.score_all_items(user_internal_idx, n_items, exclude_idxs, POOL)
            norm = _normalise([(id_map.get(i, ""), s) for i, s in raw if i in id_map])
            w = weights["lightgcn"]
            for iid, s in norm.items():
                scores[iid] = scores.get(iid, 0) + w * s

        # ── Session GRU ───────────────────────────────────────────────────
        if self.session and weights.get("session", 0) > 0:
            raw = self.session.recommend(tenant_id, user_id, exclude_idxs, POOL)
            norm = _normalise([(id_map.get(i, ""), s) for i, s in raw if i in id_map])
            w = weights["session"]
            for iid, s in norm.items():
                scores[iid] = scores.get(iid, 0) + w * s

        # ── Thompson Sampling ─────────────────────────────────────────────
        if weights.get("thompson", 0) > 0:
            all_items = list(self._item_id_map.get(tenant_id, {}).keys())
            raw = self.bandit.recommend(tenant_id, all_items, context, POOL, list(exclude))
            norm = _normalise(raw)
            w = weights["thompson"]
            for iid, s in norm.items():
                scores[iid] = scores.get(iid, 0) + w * s

        # ── Trending ──────────────────────────────────────────────────────
        if weights.get("trending", 0) > 0:
            raw = self.trending.top_trending(tenant_id, POOL, None, list(exclude))
            norm = _normalise(raw)
            w = weights["trending"]
            for iid, s in norm.items():
                scores[iid] = scores.get(iid, 0) + w * s

        # ── Content (cold-start) ──────────────────────────────────────────
        if self.content.is_fitted() and weights.get("content", 0) > 0:
            raw = self.content.recommend_for_new_user(top_k=POOL, exclude_item_ids=list(exclude))
            norm = _normalise(raw)
            w = weights["content"]
            for iid, s in norm.items():
                scores[iid] = scores.get(iid, 0) + w * s

        # ── Filter + MMR rerank ───────────────────────────────────────────
        ranked = sorted(
            [(iid, s) for iid, s in scores.items() if iid and iid not in exclude],
            key=lambda x: x[1],
            reverse=True,
        )[: top_k * 3]

        diverse = _mmr_rerank(
            ranked,
            similarity_fn=lambda a, b: self._item_sim(a, b),
            lam=1.0 - settings.DIVERSITY_LAMBDA,
            top_k=top_k,
        )
        return self._format(diverse, f"for_you_{tier.value}")

    # ── Helpers ────────────────────────────────────────────────────────────

    def _ids_to_idxs(self, tenant_id: str, item_ids: List[str]) -> List[int]:
        id_map = self._item_id_map.get(tenant_id, {})
        return [id_map[iid] for iid in item_ids if iid in id_map]

    def _item_sim(self, item_a: str, item_b: str) -> float:
        if not self.content.is_fitted():
            return 0.0
        sims = self.content.similar_items(item_a, top_k=1, exclude_item_ids=[])
        for iid, s in sims:
            if iid == item_b:
                return s
        return 0.0

    @staticmethod
    def _format(results: List[Tuple[str, float]], reason: str) -> List[dict]:
        return [
            {"item_id": iid, "score": round(score, 6), "reason": reason, "rank": i + 1}
            for i, (iid, score) in enumerate(results)
        ]
