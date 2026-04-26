"""
Neural Matrix Factorization (NeuMF) — He et al. 2017
Fuses Generalized Matrix Factorization (GMF) with a deep MLP to model
both linear and non-linear user-item interactions.
"""
import torch
import torch.nn as nn
import numpy as np
from typing import List, Optional, Tuple


class GMF(nn.Module):
    def __init__(self, num_users: int, num_items: int, embed_dim: int):
        super().__init__()
        self.user_embed = nn.Embedding(num_users, embed_dim)
        self.item_embed = nn.Embedding(num_items, embed_dim)
        nn.init.normal_(self.user_embed.weight, std=0.01)
        nn.init.normal_(self.item_embed.weight, std=0.01)

    def forward(self, user_ids: torch.Tensor, item_ids: torch.Tensor) -> torch.Tensor:
        return self.user_embed(user_ids) * self.item_embed(item_ids)


class MLP(nn.Module):
    def __init__(self, num_users: int, num_items: int, embed_dim: int, layers: List[int]):
        super().__init__()
        self.user_embed = nn.Embedding(num_users, embed_dim)
        self.item_embed = nn.Embedding(num_items, embed_dim)
        nn.init.normal_(self.user_embed.weight, std=0.01)
        nn.init.normal_(self.item_embed.weight, std=0.01)

        blocks = []
        in_dim = embed_dim * 2
        for out_dim in layers:
            blocks += [nn.Linear(in_dim, out_dim), nn.ReLU(), nn.Dropout(0.2)]
            in_dim = out_dim
        self.net = nn.Sequential(*blocks)
        self.out_dim = in_dim

    def forward(self, user_ids: torch.Tensor, item_ids: torch.Tensor) -> torch.Tensor:
        u = self.user_embed(user_ids)
        v = self.item_embed(item_ids)
        return self.net(torch.cat([u, v], dim=-1))


class NeuMF(nn.Module):
    """NeuMF: element-wise GMF output + deep MLP output → linear → sigmoid."""

    def __init__(
        self,
        num_users: int,
        num_items: int,
        gmf_embed_dim: int = 64,
        mlp_embed_dim: int = 64,
        mlp_layers: List[int] = (128, 64, 32),
    ):
        super().__init__()
        self.gmf = GMF(num_users, num_items, gmf_embed_dim)
        self.mlp = MLP(num_users, num_items, mlp_embed_dim, list(mlp_layers))
        self.output = nn.Linear(gmf_embed_dim + self.mlp.out_dim, 1)
        nn.init.kaiming_uniform_(self.output.weight)

    def forward(self, user_ids: torch.Tensor, item_ids: torch.Tensor) -> torch.Tensor:
        gmf_out = self.gmf(user_ids, item_ids)
        mlp_out = self.mlp(user_ids, item_ids)
        logit = self.output(torch.cat([gmf_out, mlp_out], dim=-1))
        return torch.sigmoid(logit).squeeze(-1)


# ── Inference helper ───────────────────────────────────────────────────────

class NCFRecommender:
    """Wraps NeuMF for fast top-k batch scoring against the full item catalog."""

    def __init__(self, model: NeuMF, device: str = "cpu"):
        self.model = model.to(device)
        self.device = device

    @torch.no_grad()
    def score_all_items(
        self,
        user_internal_idx: int,
        num_items: int,
        exclude_item_idxs: Optional[List[int]] = None,
        top_k: int = 50,
    ) -> List[Tuple[int, float]]:
        self.model.eval()
        user_tensor = torch.tensor([user_internal_idx] * num_items, device=self.device)
        item_tensor = torch.arange(num_items, device=self.device)
        scores = self.model(user_tensor, item_tensor).cpu().numpy()

        if exclude_item_idxs:
            scores[exclude_item_idxs] = -1.0

        top_idxs = np.argpartition(scores, -top_k)[-top_k:]
        top_idxs = top_idxs[np.argsort(scores[top_idxs])[::-1]]
        return [(int(idx), float(scores[idx])) for idx in top_idxs]

    def save(self, path: str):
        torch.save(self.model.state_dict(), path)

    def load(self, path: str, num_users: int, num_items: int, **kwargs):
        state = torch.load(path, map_location=self.device)
        self.model = NeuMF(num_users, num_items, **kwargs).to(self.device)
        self.model.load_state_dict(state)
        self.model.eval()
