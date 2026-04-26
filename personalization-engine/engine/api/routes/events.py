"""Event tracking endpoint — the data entry point for all user interactions."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from engine.core.database import get_db, Event, AppUser, Item, ItemStats, Tenant
from engine.api.auth import get_tenant
from engine.training.trainer import model_store
from engine.models.trending import TrendingEngine
from engine.models.thompson_bandit import ThompsonBanditEngine

router = APIRouter(prefix="/events", tags=["Events"])

# Injected by main.py at startup
trending_engine: Optional[TrendingEngine] = None
bandit_engine: Optional[ThompsonBanditEngine] = None


class EventPayload(BaseModel):
    user_id: str = Field(..., description="Your internal user/visitor identifier")
    item_id: str = Field(..., description="Your internal product/content identifier")
    event_type: str = Field(..., description="view|click|add_to_cart|purchase|like|share|rating")
    value: float = Field(1.0, description="Rating (1-5), purchase amount, or 1.0")
    session_id: Optional[str] = None
    context: Optional[dict] = {}


class BatchEventPayload(BaseModel):
    events: List[EventPayload]


@router.post("/track", summary="Track a single user interaction")
async def track_event(
    payload: EventPayload,
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return await _process_event(payload, tenant, db)


@router.post("/batch", summary="Track multiple events in one call")
async def track_batch(
    payload: BatchEventPayload,
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    results = []
    for ev in payload.events[:500]:  # max 500 per batch
        results.append(await _process_event(ev, tenant, db))
    return {"tracked": len(results)}


async def _process_event(payload: EventPayload, tenant: Tenant, db: Session):
    # Upsert user
    user = db.query(AppUser).filter_by(
        tenant_id=tenant.id, external_id=payload.user_id
    ).first()
    if not user:
        count = db.query(AppUser).filter_by(tenant_id=tenant.id).count()
        user = AppUser(
            tenant_id=tenant.id,
            external_id=payload.user_id,
            internal_idx=count,
        )
        db.add(user)

    user.event_count = (user.event_count or 0) + 1
    user.last_seen_at = datetime.utcnow()

    # Get item info for trending
    item = db.query(Item).filter_by(
        tenant_id=tenant.id, external_id=payload.item_id
    ).first()
    category = item.category if item else ""

    # Persist event
    ev = Event(
        tenant_id=tenant.id,
        user_external_id=payload.user_id,
        item_external_id=payload.item_id,
        event_type=payload.event_type,
        value=payload.value,
        session_id=payload.session_id,
        context=payload.context or {},
    )
    db.add(ev)

    # Update item stats
    stats = db.query(ItemStats).filter_by(
        tenant_id=tenant.id, item_external_id=payload.item_id
    ).first()
    if not stats:
        stats = ItemStats(tenant_id=tenant.id, item_external_id=payload.item_id)
        db.add(stats)

    et = payload.event_type
    if et == "view":
        stats.views = (stats.views or 0) + 1
    elif et == "click":
        stats.clicks = (stats.clicks or 0) + 1
    elif et == "purchase":
        stats.purchases = (stats.purchases or 0) + 1
        stats.revenue = (stats.revenue or 0) + payload.value
    elif et == "like":
        stats.likes = (stats.likes or 0) + 1
    stats.last_interaction_at = datetime.utcnow()
    tenant.event_count = (tenant.event_count or 0) + 1

    db.commit()

    # Update in-memory engines
    if trending_engine:
        trending_engine.record_event(tenant.id, payload.item_id, et, payload.value, category)

    # Update session tracker
    if item and item.internal_idx is not None and model_store.session_tracker:
        model_store.session_tracker.record(tenant.id, payload.user_id, item.internal_idx)

    # Update bandit on conversion signals
    if bandit_engine and et in ("purchase", "like", "add_to_cart"):
        bandit_engine.record_feedback(tenant.id, payload.item_id, success=True)
    elif bandit_engine and et == "view":
        # Delayed negative — will be handled by recommendation serving
        pass

    return {"status": "ok", "event_id": ev.id}
