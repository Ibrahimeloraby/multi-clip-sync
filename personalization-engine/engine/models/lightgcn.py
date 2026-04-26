"""
LightGCN — He et al. 2020
Strips NGCF down to pure neighborhood aggregation: no feature transforms,
no non-linearities. Final embedding = mean of all layer outputs.
BPR loss for training.
"""
import torch
import torch.nn as nn
import numpy as np
import scipy.sparse as sp
from typing import List, Optional, Tuple


class LightGCN(nn.Module):
    def __init__(self, num_users: int, num_items: int, embed_dim: int = 64, num_layers: int = 3):
        super().__init__()
        self.num_users = num_users
        self.num_items = num_items
        self.num_layers = num_layers

        self.embedding = nn.Embedding(num_users + num_items, embed_dim)
        nn.init.normal_(self.embedding.weight, std=0.1)

    def propagate(self, adj: torch.sparse.Tensor) -> torch.Tensor:
        all_emb = self.embedding.weight
        layer_embs = [all_emb]
        for _ in range(self.num_layers):
            all_emb = torch.sparse.mm(adj, all_emb)
            layer_embs.append(all_emb)
        return torch.stack(layer_embs, dim=1).mean(dim=1)

    def forward(
        self,
        adj: torch.sparse.Tensor,
        user_ids: torch.Tensor,
        pos_item_ids: torch.Tensor,
        neg_item_ids: Optional[torch.Tensor] = None,
    ) -> Tuple:
        final = self.propagate(adj)
        u_emb = final[user_ids]
        p_emb = final[self.num_users + pos_item_ids]

        if neg_item_ids is not None:
            n_emb = final[self.num_users + neg_item_ids]
            return u_emb, p_emb, n_emb
        return u_emb, p_emb

    @staticmethod
    def bpr_loss(
        u_emb: torch.Tensor,
        p_emb: torch.Tensor,
        n_emb: torch.Tensor,
        reg: float = 1e-4,
    ) -> torch.Tensor:
        pos = (u_emb * p_emb).sum(-1)
        neg = (u_emb * n_emb).sum(-1)
        loss = -torch.log(torch.sigmoid(pos - neg) + 1e-8).mean()
        reg_loss = (u_emb.norm(2).pow(2) + p_emb.norm(2).pow(2) + n_emb.norm(2).pow(2)) * reg
        return loss + reg_loss


# ── Sparse adjacency builder ───────────────────────────────────────────────

def build_adj_matrix(
    interactions: List[Tuple[int, int]],
    num_users: int,
    num_items: int,
    device: str = "cpu",
) -> torch.sparse.Tensor:
    """
    Symmetric normalised adjacency matrix for LightGCN.
    interactions: list of (user_internal_idx, item_internal_idx)
    """
    rows, cols = zip(*interactions) if interactions else ([], [])
    rows, cols = list(rows), list(cols)

    # Build bipartite matrix
    n = num_users + num_items
    row_idx = rows + [c + num_users for c in cols]
    col_idx = [c + num_users for c in cols] + rows
    data = [1.0] * len(row_idx)

    mat = sp.coo_matrix((data, (row_idx, col_idx)), shape=(n, n))
    mat = mat.tocsr()

    # Symmetric D^{-1/2} A D^{-1/2}
    deg = np.array(mat.sum(axis=1)).flatten()
    deg_inv_sqrt = np.where(deg > 0, deg ** -0.5, 0.0)
    D = sp.diags(deg_inv_sqrt)
    norm_mat = D @ mat @ D
    norm_coo = norm_mat.tocoo()

    indices = torch.tensor(np.vstack([norm_coo.row, norm_coo.col]), dtype=torch.long)
    values = torch.tensor(norm_coo.data, dtype=torch.float32)
    return torch.sparse_coo_tensor(indices, values, (n, n)).to(device)


# ── Inference helper ───────────────────────────────────────────────────────

class LightGCNRecommender:
    def __init__(self, model: LightGCN, adj: torch.sparse.Tensor, device: str = "cpu"):
        self.model = model.to(device)
        self.adj = adj.to(device)
        self.device = device
        self._final_emb: Optional[torch.Tensor] = None

    def precompute(self):
        self.model.eval()
        with torch.no_grad():
            self._final_emb = self.model.propagate(self.adj).cpu().numpy()

    @torch.no_grad()
    def score_all_items(
        self,
        user_internal_idx: int,
        num_items: int,
        exclude_item_idxs: Optional[List[int]] = None,
        top_k: int = 50,
    ) -> List[Tuple[int, float]]:
        if self._final_emb is None:
            self.precompute()

        u_emb = self._final_emb[user_internal_idx]
        item_embs = self._final_emb[self.model.num_users: self.model.num_users + num_items]
        scores = item_embs @ u_emb

        if exclude_item_idxs:
            scores[exclude_item_idxs] = -1e9

        top_idxs = np.argpartition(scores, -top_k)[-top_k:]
        top_idxs = top_idxs[np.argsort(scores[top_idxs])[::-1]]
        return [(int(i), float(scores[i])) for i in top_idxs]

    def save(self, path: str):
        torch.save(self.model.state_dict(), path)
