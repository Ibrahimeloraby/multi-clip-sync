"""
Session-based Recommender (GRU4Rec variant with attention)
Tracks the user's current session (sequence of item interactions) and
predicts the next most likely item — powers "Continue Where You Left Off"
and "Based on What You Actioned".
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from collections import defaultdict


class SessionGRU(nn.Module):
    """GRU encoder with self-attention over the hidden states."""

    def __init__(
        self,
        num_items: int,
        embed_dim: int = 64,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.num_items = num_items
        self.item_embed = nn.Embedding(num_items + 1, embed_dim, padding_idx=0)
        self.gru = nn.GRU(
            embed_dim,
            hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.attn = nn.Linear(hidden_size, 1)
        self.output = nn.Linear(hidden_size, num_items)
        self.dropout = nn.Dropout(dropout)

    def forward(self, session_items: torch.Tensor) -> torch.Tensor:
        """
        session_items: (batch, seq_len) — item internal indices (0 = pad)
        returns: (batch, num_items) logits
        """
        x = self.dropout(self.item_embed(session_items))
        gru_out, _ = self.gru(x)  # (batch, seq, hidden)

        # Attention over time steps
        attn_w = F.softmax(self.attn(gru_out), dim=1)  # (batch, seq, 1)
        context = (attn_w * gru_out).sum(dim=1)  # (batch, hidden)

        # Mix last hidden with context
        last = gru_out[:, -1, :]
        combined = (last + context) / 2.0
        return self.output(combined)


# ── In-memory session tracker ──────────────────────────────────────────────

class SessionTracker:
    """
    Maintains per-user session windows in RAM (or Redis in production).
    A session resets after SESSION_TIMEOUT_MINUTES of inactivity.
    """

    def __init__(self, timeout_minutes: int = 30, max_length: int = 50):
        self.timeout = timedelta(minutes=timeout_minutes)
        self.max_length = max_length
        # {tenant_id: {user_id: {"items": [...], "last_at": datetime}}}
        self._sessions: Dict[str, Dict[str, dict]] = defaultdict(dict)

    def record(self, tenant_id: str, user_id: str, item_internal_idx: int):
        now = datetime.utcnow()
        key = (tenant_id, user_id)
        session = self._sessions[tenant_id].get(user_id)

        if session is None or (now - session["last_at"]) > self.timeout:
            self._sessions[tenant_id][user_id] = {
                "items": [],
                "last_at": now,
                "started_at": now,
            }
            session = self._sessions[tenant_id][user_id]

        session["items"].append(item_internal_idx)
        if len(session["items"]) > self.max_length:
            session["items"] = session["items"][-self.max_length:]
        session["last_at"] = now

    def get_session(self, tenant_id: str, user_id: str) -> List[int]:
        session = self._sessions[tenant_id].get(user_id)
        if session is None:
            return []
        now = datetime.utcnow()
        if (now - session["last_at"]) > self.timeout:
            return []
        return session["items"]

    def get_incomplete_items(self, tenant_id: str, user_id: str) -> List[int]:
        """Items viewed this session but not purchased — for 'Continue Where You Left Off'."""
        return self.get_session(tenant_id, user_id)


# ── Inference helper ───────────────────────────────────────────────────────

class SessionRecommender:
    def __init__(self, model: SessionGRU, tracker: SessionTracker, device: str = "cpu"):
        self.model = model.to(device)
        self.tracker = tracker
        self.device = device

    @torch.no_grad()
    def recommend(
        self,
        tenant_id: str,
        user_id: str,
        exclude_item_idxs: Optional[List[int]] = None,
        top_k: int = 50,
    ) -> List[Tuple[int, float]]:
        session_items = self.tracker.get_session(tenant_id, user_id)
        if not session_items:
            return []

        self.model.eval()
        seq = torch.tensor([session_items], dtype=torch.long, device=self.device)
        logits = self.model(seq)[0].cpu().numpy()

        if exclude_item_idxs:
            logits[exclude_item_idxs] = -1e9

        top_idxs = np.argpartition(logits, -top_k)[-top_k:]
        top_idxs = top_idxs[np.argsort(logits[top_idxs])[::-1]]
        scores = torch.softmax(torch.tensor(logits), dim=0).numpy()
        return [(int(i), float(scores[i])) for i in top_idxs]

    def get_continue_where_left_off(
        self,
        tenant_id: str,
        user_id: str,
        purchased_item_idxs: Optional[List[int]] = None,
    ) -> List[int]:
        """Returns item indices the user viewed but hasn't purchased yet."""
        viewed = self.tracker.get_incomplete_items(tenant_id, user_id)
        purchased = set(purchased_item_idxs or [])
        return [i for i in viewed if i not in purchased]

    def save(self, path: str):
        torch.save(self.model.state_dict(), path)
