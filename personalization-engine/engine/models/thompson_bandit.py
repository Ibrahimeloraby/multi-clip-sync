"""
Thompson Sampling Contextual Bandit — Next Best Action
Each item maintains a Beta(α, β) posterior over its conversion probability.
At inference time, we sample from each item's posterior and surface the
highest-scoring items — balancing exploration of uncertain items with
exploitation of known performers.
Context features shift the effective prior via a learned linear model.
"""
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ArmState:
    """Beta distribution state for one item."""
    item_id: str
    alpha: float = 1.0   # prior successes
    beta: float = 1.0    # prior failures
    impressions: int = 0
    conversions: int = 0
    last_updated: datetime = field(default_factory=datetime.utcnow)

    @property
    def mean(self) -> float:
        return self.alpha / (self.alpha + self.beta)

    @property
    def uncertainty(self) -> float:
        """Higher when alpha+beta is small (less data)."""
        n = self.alpha + self.beta
        return np.sqrt(self.alpha * self.beta / (n * n * (n + 1)))

    def sample(self, rng: np.random.Generator) -> float:
        return float(rng.beta(self.alpha, self.beta))

    def record_impression(self):
        self.impressions += 1
        self.last_updated = datetime.utcnow()

    def record_conversion(self, success: bool):
        if success:
            self.alpha += 1.0
            self.conversions += 1
        else:
            self.beta += 1.0
        self.last_updated = datetime.utcnow()


# ── Contextual extension ───────────────────────────────────────────────────

class LinThompsonSampling:
    """
    Linear contextual Thompson Sampling (LinTS).
    Maintains a Bayesian linear model per arm that adjusts the reward
    estimate based on context features (user attributes, time-of-day, etc.).

    For small catalogs we use a shared covariance with per-arm bias.
    """

    def __init__(self, context_dim: int = 8, alpha: float = 1.0):
        self.context_dim = context_dim
        self.alpha = alpha  # noise precision
        # Shared prior: I (identity covariance)
        self._B: Dict[str, np.ndarray] = {}   # precision matrix per arm
        self._f: Dict[str, np.ndarray] = {}   # sufficient statistics per arm

    def _init_arm(self, arm_id: str):
        if arm_id not in self._B:
            self._B[arm_id] = self.alpha * np.eye(self.context_dim)
            self._f[arm_id] = np.zeros(self.context_dim)

    def sample_theta(self, arm_id: str, rng: np.random.Generator) -> np.ndarray:
        self._init_arm(arm_id)
        cov = np.linalg.inv(self._B[arm_id])
        mu = cov @ self._f[arm_id]
        return rng.multivariate_normal(mu, cov)

    def predict(self, arm_id: str, context: np.ndarray, rng: np.random.Generator) -> float:
        theta = self.sample_theta(arm_id, rng)
        return float(np.dot(theta, context))

    def update(self, arm_id: str, context: np.ndarray, reward: float):
        self._init_arm(arm_id)
        self._B[arm_id] += np.outer(context, context)
        self._f[arm_id] += reward * context


# ── Master bandit engine ───────────────────────────────────────────────────

class ThompsonBanditEngine:
    """
    Manages Beta arms for all items per tenant.
    Optionally uses contextual LinTS when context features are provided.
    """

    def __init__(self, alpha_prior: float = 1.0, beta_prior: float = 1.0, seed: int = 42):
        self.alpha_prior = alpha_prior
        self.beta_prior = beta_prior
        self.rng = np.random.default_rng(seed)
        # {tenant_id: {item_id: ArmState}}
        self._arms: Dict[str, Dict[str, ArmState]] = {}
        # Optional contextual LinTS per tenant
        self._lin: Dict[str, LinThompsonSampling] = {}

    def _get_arm(self, tenant_id: str, item_id: str) -> ArmState:
        tenant = self._arms.setdefault(tenant_id, {})
        if item_id not in tenant:
            tenant[item_id] = ArmState(
                item_id=item_id,
                alpha=self.alpha_prior,
                beta=self.beta_prior,
            )
        return tenant[item_id]

    def load_from_db_rows(self, tenant_id: str, rows: List[dict]):
        """Hydrate state from BanditState DB rows (called at startup)."""
        for row in rows:
            arm = self._get_arm(tenant_id, row["item_external_id"])
            arm.alpha = row["alpha"]
            arm.beta = row["beta"]
            arm.impressions = row["impressions"]
            arm.conversions = row["conversions"]

    def record_impression(self, tenant_id: str, item_id: str):
        self._get_arm(tenant_id, item_id).record_impression()

    def record_feedback(self, tenant_id: str, item_id: str, success: bool):
        """Call this after a user converts (purchase/click) or ignores (timeout)."""
        arm = self._get_arm(tenant_id, item_id)
        arm.record_conversion(success)

    def recommend(
        self,
        tenant_id: str,
        candidate_item_ids: List[str],
        context: Optional[np.ndarray] = None,
        top_k: int = 10,
        exclude_item_ids: Optional[List[str]] = None,
        num_samples: int = 1,
    ) -> List[Tuple[str, float]]:
        """
        Sample from each arm's posterior and return the top-k items.
        With context, uses LinTS to adjust scores.
        num_samples > 1 averages multiple draws (reduces variance, less exploration).
        """
        exclude = set(exclude_item_ids or [])
        scored = []

        lin = self._lin.get(tenant_id) if context is not None else None

        for item_id in candidate_item_ids:
            if item_id in exclude:
                continue
            arm = self._get_arm(tenant_id, item_id)

            # Average multiple posterior samples for stability
            base_score = np.mean([arm.sample(self.rng) for _ in range(num_samples)])

            # Add contextual adjustment if available
            if lin is not None and context is not None:
                ctx_score = lin.predict(item_id, context, self.rng)
                score = 0.7 * base_score + 0.3 * float(np.clip(ctx_score, 0, 1))
            else:
                score = base_score

            scored.append((item_id, float(score)))

        scored.sort(key=lambda x: x[1], reverse=True)

        # Record impressions for the surfaced items
        for item_id, _ in scored[:top_k]:
            self.record_impression(tenant_id, item_id)

        return scored[:top_k]

    def get_arm_stats(self, tenant_id: str, item_id: str) -> dict:
        arm = self._get_arm(tenant_id, item_id)
        return {
            "mean_cvr": arm.mean,
            "uncertainty": arm.uncertainty,
            "impressions": arm.impressions,
            "conversions": arm.conversions,
            "alpha": arm.alpha,
            "beta": arm.beta,
        }

    def enable_contextual(self, tenant_id: str, context_dim: int = 8):
        self._lin[tenant_id] = LinThompsonSampling(context_dim=context_dim)

    def update_context(self, tenant_id: str, item_id: str, context: np.ndarray, reward: float):
        if tenant_id in self._lin:
            self._lin[tenant_id].update(item_id, context, reward)
