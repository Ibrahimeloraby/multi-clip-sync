"""
Feature Engineering & Interaction Matrix Builder
Converts raw DB records into tensors / matrices for model training.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

# Event weights used when building implicit feedback
EVENT_WEIGHTS = {
    "view": 1.0,
    "click": 2.0,
    "add_to_cart": 3.0,
    "like": 3.0,
    "share": 2.5,
    "rating": 4.0,  # scaled separately by rating value
    "purchase": 5.0,
}


def build_interaction_matrix(
    events: List[dict],
    user_id_map: Dict[str, int],
    item_id_map: Dict[str, int],
    weight_by_event: bool = True,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Returns (user_idxs, item_idxs, weights) arrays for training.
    Aggregates multiple events per (user, item) pair.
    """
    aggregated: Dict[Tuple[int, int], float] = defaultdict(float)

    for ev in events:
        uid = user_id_map.get(ev["user_external_id"])
        iid = item_id_map.get(ev["item_external_id"])
        if uid is None or iid is None:
            continue
        et = ev.get("event_type", "view")
        w = EVENT_WEIGHTS.get(et, 1.0)
        if et == "rating":
            w *= float(ev.get("value", 3.0)) / 5.0
        aggregated[(uid, iid)] += w

    if not aggregated:
        return np.array([]), np.array([]), np.array([])

    pairs = list(aggregated.keys())
    weights = np.array([aggregated[p] for p in pairs], dtype=np.float32)
    # Clip to [0, 10] and normalise to [0, 1]
    weights = np.clip(weights, 0, 10) / 10.0

    user_idxs = np.array([p[0] for p in pairs], dtype=np.int64)
    item_idxs = np.array([p[1] for p in pairs], dtype=np.int64)
    return user_idxs, item_idxs, weights


def build_negative_samples(
    user_idxs: np.ndarray,
    item_idxs: np.ndarray,
    num_items: int,
    num_negatives: int = 4,
    rng: Optional[np.random.Generator] = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Uniform negative sampling — for each positive (u, i) sample
    `num_negatives` items the user has NOT interacted with.
    """
    if rng is None:
        rng = np.random.default_rng(42)

    positive_set = set(zip(user_idxs.tolist(), item_idxs.tolist()))
    neg_users, neg_items, neg_labels = [], [], []

    for u, i in zip(user_idxs, item_idxs):
        count = 0
        while count < num_negatives:
            neg_i = rng.integers(0, num_items)
            if (int(u), int(neg_i)) not in positive_set:
                neg_users.append(u)
                neg_items.append(neg_i)
                neg_labels.append(0.0)
                count += 1

    return (
        np.array(neg_users, dtype=np.int64),
        np.array(neg_items, dtype=np.int64),
        np.array(neg_labels, dtype=np.float32),
    )


def build_session_sequences(
    events: List[dict],
    user_id_map: Dict[str, int],
    item_id_map: Dict[str, int],
    session_timeout_minutes: int = 30,
    max_seq_len: int = 50,
) -> List[List[int]]:
    """
    Groups events into sessions and returns item index sequences for training.
    Each sequence is: [item_1, item_2, ..., item_n-1] → predict item_n
    """
    from datetime import datetime, timedelta

    timeout = timedelta(minutes=session_timeout_minutes)
    df = pd.DataFrame(events)
    if df.empty:
        return []

    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
    df = df.dropna(subset=["created_at"]).sort_values("created_at")

    sequences = []
    for user_ext_id, group in df.groupby("user_external_id"):
        uid = user_id_map.get(user_ext_id)
        if uid is None:
            continue
        session: List[int] = []
        last_ts = None
        for _, row in group.iterrows():
            ts = row["created_at"]
            iid = item_id_map.get(row["item_external_id"])
            if iid is None:
                continue
            if last_ts and (ts - last_ts) > timeout:
                if len(session) >= 2:
                    sequences.append(session[-max_seq_len:])
                session = []
            session.append(iid)
            last_ts = ts
        if len(session) >= 2:
            sequences.append(session[-max_seq_len:])

    return sequences


def user_context_vector(
    user_attributes: dict,
    context: dict,
    dim: int = 8,
) -> np.ndarray:
    """
    Encode user + request context into a fixed-dim float vector
    for contextual Thompson Sampling.
    """
    vec = np.zeros(dim, dtype=np.float32)
    hour = context.get("hour_of_day", 12) / 23.0
    dow = context.get("day_of_week", 0) / 6.0
    is_mobile = float(context.get("is_mobile", False))
    is_returning = float(user_attributes.get("is_returning", False))
    total_purchases = min(float(user_attributes.get("total_purchases", 0)) / 50.0, 1.0)
    avg_order_value = min(float(user_attributes.get("avg_order_value", 0)) / 500.0, 1.0)
    days_since_last = min(float(user_attributes.get("days_since_last_visit", 0)) / 30.0, 1.0)
    category_affinity = float(user_attributes.get("top_category_affinity", 0.5))

    vec[:8] = [hour, dow, is_mobile, is_returning, total_purchases,
               avg_order_value, days_since_last, category_affinity]
    return vec
