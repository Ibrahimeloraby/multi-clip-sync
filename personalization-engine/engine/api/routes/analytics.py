"""Analytics endpoints — engagement metrics, uplift tracking, model insights."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta

from engine.core.database import get_db, Event, AppUser, Item, ItemStats, Tenant
from engine.api.auth import get_tenant

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", summary="Dashboard overview metrics")
async def overview(
    days: int = Query(30, ge=1, le=365),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    events = db.query(Event).filter(Event.tenant_id == tenant.id, Event.created_at >= since)

    total_events = events.count()
    purchases = events.filter(Event.event_type == "purchase")
    total_purchases = purchases.count()
    total_revenue = db.query(func.sum(Event.value)).filter(
        Event.tenant_id == tenant.id,
        Event.event_type == "purchase",
        Event.created_at >= since,
    ).scalar() or 0.0

    unique_users = db.query(func.count(func.distinct(Event.user_external_id))).filter(
        Event.tenant_id == tenant.id, Event.created_at >= since
    ).scalar() or 0

    views = events.filter(Event.event_type == "view").count()
    cvr = (total_purchases / views * 100) if views > 0 else 0.0

    return {
        "period_days": days,
        "total_events": total_events,
        "unique_users": unique_users,
        "total_purchases": total_purchases,
        "total_revenue": round(total_revenue, 2),
        "conversion_rate_pct": round(cvr, 2),
        "views": views,
        "clicks": events.filter(Event.event_type == "click").count(),
        "add_to_carts": events.filter(Event.event_type == "add_to_cart").count(),
    }


@router.get("/top-items", summary="Best performing items")
async def top_items(
    metric: str = Query("purchases", description="views|clicks|purchases|revenue"),
    limit: int = Query(10, ge=1, le=100),
    days: int = Query(30),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    event_type = "purchase" if metric in ("purchases", "revenue") else metric

    rows = (
        db.query(Event.item_external_id, func.count(Event.id).label("count"),
                 func.sum(Event.value).label("value_sum"))
        .filter(Event.tenant_id == tenant.id, Event.event_type == event_type, Event.created_at >= since)
        .group_by(Event.item_external_id)
        .order_by(func.sum(Event.value).desc() if metric == "revenue" else func.count(Event.id).desc())
        .limit(limit)
        .all()
    )

    result = []
    for row in rows:
        item = db.query(Item).filter_by(tenant_id=tenant.id, external_id=row.item_external_id).first()
        result.append({
            "item_id": row.item_external_id,
            "title": item.title if item else None,
            "count": row.count,
            "revenue": round(float(row.value_sum or 0), 2),
        })
    return result


@router.get("/user-segments", summary="User maturity breakdown")
async def user_segments(
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    users = db.query(AppUser).filter_by(tenant_id=tenant.id).all()
    cold = sum(1 for u in users if (u.event_count or 0) <= 5)
    warm = sum(1 for u in users if 6 <= (u.event_count or 0) <= 50)
    hot = sum(1 for u in users if (u.event_count or 0) > 50)
    total = len(users)
    return {
        "total_users": total,
        "cold_users": cold,
        "warm_users": warm,
        "hot_users": hot,
        "cold_pct": round(cold / total * 100, 1) if total else 0,
        "warm_pct": round(warm / total * 100, 1) if total else 0,
        "hot_pct": round(hot / total * 100, 1) if total else 0,
    }


@router.get("/engagement-funnel", summary="View → Click → Cart → Purchase funnel")
async def funnel(
    days: int = Query(30),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    base = db.query(Event).filter(Event.tenant_id == tenant.id, Event.created_at >= since)
    views = base.filter(Event.event_type == "view").count()
    clicks = base.filter(Event.event_type == "click").count()
    carts = base.filter(Event.event_type == "add_to_cart").count()
    purchases = base.filter(Event.event_type == "purchase").count()

    def pct(a, b):
        return round(a / b * 100, 1) if b else 0

    return {
        "views": views,
        "clicks": clicks,
        "add_to_carts": carts,
        "purchases": purchases,
        "click_rate_pct": pct(clicks, views),
        "cart_rate_pct": pct(carts, clicks),
        "purchase_rate_pct": pct(purchases, carts),
        "overall_cvr_pct": pct(purchases, views),
    }


@router.get("/item-bandit-stats", summary="Thompson Sampling stats for an item")
async def bandit_stats(
    item_id: str = Query(...),
    tenant: Tenant = Depends(get_tenant),
):
    from engine.api.routes.recommendations import bandit_engine
    if bandit_engine is None:
        return {"error": "Bandit engine not initialised"}
    stats = bandit_engine.get_arm_stats(tenant.id, item_id)
    return {"item_id": item_id, **stats}
