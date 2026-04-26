"""
Content-Based Recommender — TF-IDF + Attribute Similarity
Primary purpose: cold-start for new users and new items.
Also powers "Similar Items" surface.
Uses item metadata: title, description, tags, category, price range.
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from typing import Dict, List, Optional, Tuple
import re


def _clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


class ContentBasedRecommender:
    """
    Builds a TF-IDF matrix over item text + a numeric attribute matrix
    for price/rating similarity. Combines both via weighted cosine.
    """

    def __init__(
        self,
        text_weight: float = 0.65,
        attribute_weight: float = 0.20,
        category_weight: float = 0.15,
        max_features: int = 5000,
    ):
        self.text_weight = text_weight
        self.attribute_weight = attribute_weight
        self.category_weight = category_weight

        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            ngram_range=(1, 2),
            stop_words="english",
            sublinear_tf=True,
        )
        self.scaler = MinMaxScaler()

        # Fitted artifacts
        self._tfidf_matrix: Optional[np.ndarray] = None
        self._attr_matrix: Optional[np.ndarray] = None
        self._cat_matrix: Optional[np.ndarray] = None
        self._item_ids: List[str] = []
        self._id_to_idx: Dict[str, int] = {}
        self._categories: List[str] = []

    def fit(self, items: List[dict]):
        """
        items: list of dicts with keys:
          external_id, title, description, tags, category, subcategory, price, attributes
        """
        self._item_ids = [it["external_id"] for it in items]
        self._id_to_idx = {iid: i for i, iid in enumerate(self._item_ids)}

        # ── Text features ──────────────────────────────────────────────────
        corpus = []
        for it in items:
            parts = [
                it.get("title", "") or "",
                it.get("description", "") or "",
                " ".join(it.get("tags", []) or []),
                it.get("category", "") or "",
                it.get("subcategory", "") or "",
            ]
            corpus.append(_clean_text(" ".join(parts)))

        self._tfidf_matrix = self.vectorizer.fit_transform(corpus).toarray().astype(np.float32)

        # ── Numeric attribute features ────────────────────────────────────
        attr_rows = []
        for it in items:
            attrs = it.get("attributes", {}) or {}
            row = [
                float(it.get("price", 0) or 0),
                float(attrs.get("rating", 0) or 0),
                float(attrs.get("review_count", 0) or 0),
            ]
            attr_rows.append(row)

        attr_array = np.array(attr_rows, dtype=np.float32)
        if attr_array.max(axis=0).max() > 0:
            self._attr_matrix = self.scaler.fit_transform(attr_array)
        else:
            self._attr_matrix = attr_array

        # ── Category one-hot ──────────────────────────────────────────────
        self._categories = sorted(set(it.get("category", "") or "other" for it in items))
        cat_to_idx = {c: i for i, c in enumerate(self._categories)}
        cat_matrix = np.zeros((len(items), len(self._categories)), dtype=np.float32)
        for row_idx, it in enumerate(items):
            cat = it.get("category", "") or "other"
            if cat in cat_to_idx:
                cat_matrix[row_idx, cat_to_idx[cat]] = 1.0
        self._cat_matrix = cat_matrix

    def _combined_sim(self, idx_a: int, idx_b: int) -> float:
        t_sim = float(cosine_similarity(
            self._tfidf_matrix[idx_a:idx_a+1],
            self._tfidf_matrix[idx_b:idx_b+1]
        )[0, 0])
        a_sim = float(cosine_similarity(
            self._attr_matrix[idx_a:idx_a+1],
            self._attr_matrix[idx_b:idx_b+1]
        )[0, 0])
        c_sim = float(cosine_similarity(
            self._cat_matrix[idx_a:idx_a+1],
            self._cat_matrix[idx_b:idx_b+1]
        )[0, 0])
        return self.text_weight * t_sim + self.attribute_weight * a_sim + self.category_weight * c_sim

    def similar_items(
        self,
        item_id: str,
        top_k: int = 20,
        exclude_item_ids: Optional[List[str]] = None,
    ) -> List[Tuple[str, float]]:
        if self._tfidf_matrix is None or item_id not in self._id_to_idx:
            return []

        idx = self._id_to_idx[item_id]
        exclude = set(exclude_item_ids or [])
        exclude.add(item_id)

        # Vectorised similarity across all items
        t_sims = cosine_similarity(
            self._tfidf_matrix[idx:idx+1], self._tfidf_matrix
        )[0]
        a_sims = cosine_similarity(
            self._attr_matrix[idx:idx+1], self._attr_matrix
        )[0]
        c_sims = cosine_similarity(
            self._cat_matrix[idx:idx+1], self._cat_matrix
        )[0]

        combined = (
            self.text_weight * t_sims
            + self.attribute_weight * a_sims
            + self.category_weight * c_sims
        )

        scored = [
            (self._item_ids[i], float(combined[i]))
            for i in range(len(self._item_ids))
            if self._item_ids[i] not in exclude
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def recommend_for_new_user(
        self,
        liked_item_ids: Optional[List[str]] = None,
        category_preference: Optional[str] = None,
        price_min: float = 0.0,
        price_max: float = float("inf"),
        top_k: int = 20,
        exclude_item_ids: Optional[List[str]] = None,
    ) -> List[Tuple[str, float]]:
        """Cold-start: score items by similarity to seed items or category."""
        if self._tfidf_matrix is None:
            return []

        exclude = set(exclude_item_ids or [])
        scores = np.zeros(len(self._item_ids), dtype=np.float32)

        if liked_item_ids:
            valid = [iid for iid in liked_item_ids if iid in self._id_to_idx]
            if valid:
                seed_idxs = [self._id_to_idx[iid] for iid in valid]
                # Average similarity to all seed items
                t_sims = cosine_similarity(
                    self._tfidf_matrix[seed_idxs].mean(axis=0, keepdims=True),
                    self._tfidf_matrix,
                )[0]
                scores += self.text_weight * t_sims

        if category_preference and self._categories:
            cat_to_idx = {c: i for i, c in enumerate(self._categories)}
            if category_preference in cat_to_idx:
                c_idx = cat_to_idx[category_preference]
                scores += self.category_weight * self._cat_matrix[:, c_idx]

        result = []
        for i, (item_id, score) in enumerate(zip(self._item_ids, scores)):
            if item_id in exclude:
                continue
            result.append((item_id, float(score)))

        result.sort(key=lambda x: x[1], reverse=True)
        return result[:top_k]

    def is_fitted(self) -> bool:
        return self._tfidf_matrix is not None

    def item_count(self) -> int:
        return len(self._item_ids)
