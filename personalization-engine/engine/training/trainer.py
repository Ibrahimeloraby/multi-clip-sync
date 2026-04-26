"""
Model Trainer — orchestrates NCF, LightGCN, and Session GRU training.
Called by the scheduler (APScheduler) on a rolling basis, or on-demand
via the admin API after bulk data ingestion.
"""
import os
import logging
import torch
import torch.nn as nn
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from engine.core.config import settings
from engine.models.ncf import NeuMF, NCFRecommender
from engine.models.lightgcn import LightGCN, LightGCNRecommender, build_adj_matrix
from engine.models.session import SessionGRU, SessionRecommender, SessionTracker
from engine.data.preprocessing import (
    build_interaction_matrix,
    build_negative_samples,
    build_session_sequences,
)

logger = logging.getLogger(__name__)


def _make_model_path(tenant_id: str, model_type: str, base_dir: str = "./models") -> str:
    os.makedirs(f"{base_dir}/{tenant_id}", exist_ok=True)
    return f"{base_dir}/{tenant_id}/{model_type}.pt"


class TenantModelStore:
    """Holds all trained model instances per tenant in memory."""

    def __init__(self):
        self.ncf: Dict[str, NCFRecommender] = {}
        self.lightgcn: Dict[str, LightGCNRecommender] = {}
        self.session_tracker = SessionTracker(
            timeout_minutes=settings.SESSION_TIMEOUT_MINUTES,
            max_length=settings.SESSION_MAX_LENGTH,
        )
        self.session: Dict[str, SessionRecommender] = {}
        # item maps per tenant
        self.item_id_to_idx: Dict[str, Dict[str, int]] = {}
        self.item_idx_to_id: Dict[str, Dict[int, str]] = {}
        self.user_id_to_idx: Dict[str, Dict[str, int]] = {}
        self.num_items: Dict[str, int] = {}
        self.num_users: Dict[str, int] = {}


model_store = TenantModelStore()


class ModelTrainer:

    def __init__(self, store: TenantModelStore = model_store):
        self.store = store
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def train_all(self, tenant_id: str, items: List[dict], events: List[dict]):
        """Entry point: trains all models for one tenant."""
        if not items or not events:
            logger.warning(f"[{tenant_id}] Skipping training — no items or events.")
            return

        # Build index maps
        item_id_map = {it["external_id"]: i for i, it in enumerate(items)}
        item_idx_map = {i: it["external_id"] for i, it in enumerate(items)}
        user_ids = list({ev["user_external_id"] for ev in events})
        user_id_map = {uid: i for i, uid in enumerate(user_ids)}

        num_items = len(item_id_map)
        num_users = len(user_id_map)

        self.store.item_id_to_idx[tenant_id] = item_id_map
        self.store.item_idx_to_id[tenant_id] = item_idx_map
        self.store.user_id_to_idx[tenant_id] = user_id_map
        self.store.num_items[tenant_id] = num_items
        self.store.num_users[tenant_id] = num_users

        logger.info(f"[{tenant_id}] Training with {num_users} users, {num_items} items, {len(events)} events")

        user_idxs, item_idxs, weights = build_interaction_matrix(events, user_id_map, item_id_map)

        if len(user_idxs) >= settings.MIN_INTERACTIONS_FOR_NCF:
            self._train_ncf(tenant_id, user_idxs, item_idxs, weights, num_users, num_items)
            self._train_lightgcn(tenant_id, user_idxs, item_idxs, num_users, num_items)

        sequences = build_session_sequences(events, user_id_map, item_id_map)
        if sequences:
            self._train_session(tenant_id, sequences, num_items)

        logger.info(f"[{tenant_id}] Training complete.")

    # ── NeuMF ──────────────────────────────────────────────────────────────

    def _train_ncf(
        self, tenant_id, user_idxs, item_idxs, weights, num_users, num_items
    ):
        model = NeuMF(
            num_users=num_users,
            num_items=num_items,
            gmf_embed_dim=settings.NCF_EMBED_DIM,
            mlp_embed_dim=settings.NCF_EMBED_DIM,
            mlp_layers=settings.NCF_MLP_LAYERS,
        ).to(self.device)

        optimizer = torch.optim.Adam(model.parameters(), lr=settings.LEARNING_RATE)
        loss_fn = nn.BCELoss()

        neg_u, neg_i, _ = build_negative_samples(
            user_idxs, item_idxs, num_items, settings.NEGATIVE_SAMPLES
        )

        all_users = np.concatenate([user_idxs, neg_u])
        all_items = np.concatenate([item_idxs, neg_i])
        all_labels = np.concatenate([np.ones(len(user_idxs)), np.zeros(len(neg_u))]).astype(np.float32)

        dataset = torch.utils.data.TensorDataset(
            torch.tensor(all_users, dtype=torch.long),
            torch.tensor(all_items, dtype=torch.long),
            torch.tensor(all_labels, dtype=torch.float32),
        )
        loader = torch.utils.data.DataLoader(dataset, batch_size=settings.BATCH_SIZE, shuffle=True)

        model.train()
        for epoch in range(settings.NUM_EPOCHS):
            total_loss = 0.0
            for u_batch, i_batch, y_batch in loader:
                u_batch = u_batch.to(self.device)
                i_batch = i_batch.to(self.device)
                y_batch = y_batch.to(self.device)
                optimizer.zero_grad()
                preds = model(u_batch, i_batch)
                loss = loss_fn(preds, y_batch)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            if (epoch + 1) % 5 == 0:
                logger.info(f"[{tenant_id}] NCF epoch {epoch+1}/{settings.NUM_EPOCHS} loss={total_loss/len(loader):.4f}")

        path = _make_model_path(tenant_id, "ncf")
        torch.save(model.state_dict(), path)
        self.store.ncf[tenant_id] = NCFRecommender(model, self.device)
        logger.info(f"[{tenant_id}] NCF saved to {path}")

    # ── LightGCN ───────────────────────────────────────────────────────────

    def _train_lightgcn(self, tenant_id, user_idxs, item_idxs, num_users, num_items):
        interactions = list(zip(user_idxs.tolist(), item_idxs.tolist()))
        adj = build_adj_matrix(interactions, num_users, num_items, self.device)

        model = LightGCN(
            num_users=num_users,
            num_items=num_items,
            embed_dim=settings.LIGHTGCN_EMBED_DIM,
            num_layers=settings.LIGHTGCN_NUM_LAYERS,
        ).to(self.device)

        optimizer = torch.optim.Adam(model.parameters(), lr=settings.LEARNING_RATE)
        rng = np.random.default_rng(42)

        all_u = torch.tensor(user_idxs, dtype=torch.long, device=self.device)
        all_i = torch.tensor(item_idxs, dtype=torch.long, device=self.device)
        n = len(user_idxs)

        for epoch in range(settings.NUM_EPOCHS):
            model.train()
            idx = rng.permutation(n)
            total_loss = 0.0
            for start in range(0, n, settings.BATCH_SIZE):
                batch_idx = idx[start: start + settings.BATCH_SIZE]
                u_b = all_u[batch_idx]
                p_b = all_i[batch_idx]
                # Sample random negatives
                neg_i = torch.randint(0, num_items, (len(batch_idx),), device=self.device)

                optimizer.zero_grad()
                u_emb, p_emb, n_emb = model(adj, u_b, p_b, neg_i)
                loss = model.bpr_loss(u_emb, p_emb, n_emb)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            if (epoch + 1) % 5 == 0:
                logger.info(f"[{tenant_id}] LightGCN epoch {epoch+1}/{settings.NUM_EPOCHS} loss={total_loss:.4f}")

        path = _make_model_path(tenant_id, "lightgcn")
        torch.save(model.state_dict(), path)
        rec = LightGCNRecommender(model, adj, self.device)
        rec.precompute()
        self.store.lightgcn[tenant_id] = rec
        logger.info(f"[{tenant_id}] LightGCN saved to {path}")

    # ── Session GRU ─────────────────────────────────────────────────────────

    def _train_session(self, tenant_id, sequences: List[List[int]], num_items: int):
        model = SessionGRU(
            num_items=num_items,
            embed_dim=settings.SESSION_EMBED_DIM,
            hidden_size=settings.SESSION_HIDDEN_SIZE,
            num_layers=settings.SESSION_NUM_LAYERS,
        ).to(self.device)

        optimizer = torch.optim.Adam(model.parameters(), lr=settings.LEARNING_RATE)
        loss_fn = nn.CrossEntropyLoss()

        # Build (input_seq, target) pairs
        inputs, targets = [], []
        for seq in sequences:
            if len(seq) < 2:
                continue
            for i in range(1, len(seq)):
                inputs.append(seq[:i][-settings.SESSION_MAX_LENGTH:])
                targets.append(seq[i])

        if not inputs:
            return

        # Pad sequences
        max_len = max(len(s) for s in inputs)

        def pad(s):
            return [0] * (max_len - len(s)) + s

        input_tensor = torch.tensor([pad(s) for s in inputs], dtype=torch.long, device=self.device)
        target_tensor = torch.tensor(targets, dtype=torch.long, device=self.device)
        dataset = torch.utils.data.TensorDataset(input_tensor, target_tensor)
        loader = torch.utils.data.DataLoader(dataset, batch_size=settings.BATCH_SIZE, shuffle=True)

        for epoch in range(settings.NUM_EPOCHS):
            model.train()
            total_loss = 0.0
            for x_batch, y_batch in loader:
                optimizer.zero_grad()
                logits = model(x_batch)
                loss = loss_fn(logits, y_batch)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            if (epoch + 1) % 5 == 0:
                logger.info(f"[{tenant_id}] Session epoch {epoch+1}/{settings.NUM_EPOCHS} loss={total_loss/len(loader):.4f}")

        path = _make_model_path(tenant_id, "session")
        torch.save(model.state_dict(), path)
        self.store.session[tenant_id] = SessionRecommender(model, self.store.session_tracker, self.device)
        logger.info(f"[{tenant_id}] Session GRU saved to {path}")
