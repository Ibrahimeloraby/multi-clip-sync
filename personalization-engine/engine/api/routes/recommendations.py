"""Recommendation endpoints — the core value delivery surface."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import numpy as np

from engine.core.database import get_db, AppUser, Item, Tenant
from engine.api.auth import get_tenant
from engine.models.ensemble import MasterEnsemble, Surface
from engine.models.trending import TrendingEngine
from engine.models.thompson_bandit import ThompsonBanditEngine
from engine.models.content_based import ContentBasedRecommender
from engine.training.trainer import model_store
from engine.data.preprocessing import user_context_vector

router = APIRouter(prefix="/recommend", tags=["Recommendations"])

# Injected at startup
ensemble: Optional[MasterEnsemble] = None
trending_engine: Optional[TrendingEngine] = None
bandit_engine: Optional[ThompsonBanditEngine] = None
content_rec: Optional[ContentBasedRecommender] = None


class RecommendationItem(BaseModel):
    item_id: str
    score: float
    reason: str
    rank: int
    item_data: Optional[dict] = None


class RecommendResponse(BaseModel):
    surface: str
    user_id: str
    recommendations: List[RecommendationItem]
    user_tier: str
    generated_at: str


def _get_user_tier(event_count: int) -> str:
    if event_count <= 5:
        return "cold"
    if event_count <= 50:
        return "warm"
    return "hot"


def _enrich_with_item_data(recs: List[dict], tenant_id: str, db: Session) -> List[dict]:
    item_ids = [r["item_id"] for r in recs]
    items = db.query(Item).filter(
        Item.tenant_id == tenant_id,
        Item.external_id.in_(item_ids),
    ).all()
    item_map = {it.external_id: it for it in items}

    for rec in recs:
        it = item_map.get(rec["item_id"])
        if it:
            rec["item_data"] = {
                "title": it.title,
                "description": it.description,
                "category": it.category,
                "price": it.price,
                "image_url": it.image_url,
                "url": it.url,
                "tags": it.tags,
            }
    return recs


@router.get("/for-you", response_model=RecommendResponse, summary="Personalised recommendations")
async def for_you(
    user_id: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    exclude: Optional[str] = Query(None, description="Comma-separated item IDs to exclude"),
    include_item_data: bool = Query(False),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return await _recommend(Surface.FOR_YOU, user_id, limit, exclude, include_item_data, tenant, db)


@router.get("/trending", response_model=RecommendResponse, summary="Trending items")
async def trending(
    user_id: str = Query("anonymous"),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = Query(None),
    include_item_data: bool = Query(False),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return await _recommend(Surface.TRENDING, user_id, limit, None, include_item_data, tenant, db,
                            category_filter=category)


@router.get("/top", response_model=RecommendResponse, summary="Top 10 most popular")
async def top_items(
    user_id: str = Query("anonymous"),
    limit: int = Query(10, ge=1, le=50),
    include_item_data: bool = Query(False),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return await _recommend(Surface.TOP_10, user_id, limit, None, include_item_data, tenant, db)


@router.get("/because-you-actioned", response_model=RecommendResponse,
            summary="Based on what you viewed and clicked")
async def because_you_actioned(
    user_id: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    include_item_data: bool = Query(False),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return await _recommend(Surface.BECAUSE_YOU_ACTIONED, user_id, limit, None, include_item_data, tenant, db)


@router.get("/continue", response_model=RecommendResponse, summary="Continue where you left off")
async def continue_where_left_off(
    user_id: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    include_item_data: bool = Query(False),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return await _recommend(Surface.CONTINUE_LEFT_OFF, user_id, limit, None, include_item_data, tenant, db)


@router.get("/next-best-action", response_model=RecommendResponse, summary="Next best action")
async def next_best_action(
    user_id: str = Query(...),
    limit: int = Query(5, ge=1, le=20),
    include_item_data: bool = Query(False),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return await _recommend(Surface.NEXT_BEST_ACTION, user_id, limit, None, include_item_data, tenant, db)


@router.get("/similar", response_model=RecommendResponse, summary="Similar items")
async def similar(
    item_id: str = Query(...),
    user_id: str = Query("anonymous"),
    limit: int = Query(10, ge=1, le=50),
    include_item_data: bool = Query(False),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    return await _recommend(Surface.SIMILAR, user_id, limit, None, include_item_data, tenant, db,
                            anchor_item_id=item_id)


# ── Core dispatch ──────────────────────────────────────────────────────────

async def _recommend(
    surface: Surface,
    user_id: str,
    limit: int,
    exclude_str: Optional[str],
    include_item_data: bool,
    tenant: Tenant,
    db: Session,
    anchor_item_id: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> dict:
    if ensemble is None:
        # Engine not yet initialised — fall back to trending
        recs = trending_engine.top_trending(tenant.id, limit) if trending_engine else []
        results = [{"item_id": iid, "score": s, "reason": "trending_fallback", "rank": i+1}
                   for i, (iid, s) in enumerate(recs)]
        return _build_response(surface, user_id, results, "cold", include_item_data, tenant.id, db)

    # Fetch user record
    user = db.query(AppUser).filter_by(tenant_id=tenant.id, external_id=user_id).first()
    user_event_count = user.event_count if user else 0
    user_internal_idx = user.internal_idx if user else None

    exclude = [x.strip() for x in (exclude_str or "").split(",") if x.strip()]

    # Get purchase history for "continue" surface
    purchased_ids = []
    if surface == Surface.CONTINUE_LEFT_OFF and user:
        from engine.core.database import Event
        rows = db.query(Event.item_external_id).filter_by(
            tenant_id=tenant.id, user_external_id=user_id, event_type="purchase"
        ).all()
        purchased_ids = [r[0] for r in rows]

    # Build context vector
    user_attrs = (user.attributes or {}) if user else {}
    from datetime import datetime
    ctx_vec = user_context_vector(user_attrs, {
        "hour_of_day": datetime.utcnow().hour,
        "day_of_week": datetime.utcnow().weekday(),
    })

    results = ensemble.recommend(
        tenant_id=tenant.id,
        user_external_id=user_id,
        user_internal_idx=user_internal_idx,
        user_event_count=user_event_count,
        surface=surface,
        top_k=limit,
        exclude_item_ids=exclude or None,
        anchor_item_id=anchor_item_id,
        purchased_item_ids=purchased_ids,
        context=ctx_vec,
        category_filter=category_filter,
    )

    tier = _get_user_tier(user_event_count)
    return _build_response(surface, user_id, results, tier, include_item_data, tenant.id, db)


def _build_response(surface, user_id, results, tier, include_item_data, tenant_id, db):
    if include_item_data and results:
        results = _enrich_with_item_data(results, tenant_id, db)

    return {
        "surface": surface.value if hasattr(surface, "value") else str(surface),
        "user_id": user_id,
        "recommendations": results,
        "user_tier": tier,
        "generated_at": datetime.utcnow().isoformat(),
    }
