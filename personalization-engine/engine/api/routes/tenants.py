"""Tenant management + data ingestion endpoints."""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import logging

from engine.core.database import get_db, Tenant, Item, AppUser, Event, ItemStats
from engine.api.auth import generate_api_key, get_tenant
from engine.data.ingestion import DataIngestionPipeline
from engine.training.trainer import ModelTrainer, model_store
from engine.models.content_based import ContentBasedRecommender

router = APIRouter(prefix="/tenants", tags=["Tenants"])
logger = logging.getLogger(__name__)
ingestion = DataIngestionPipeline()


class CreateTenantRequest(BaseModel):
    name: str
    plan: str = "starter"


class TenantResponse(BaseModel):
    id: str
    name: str
    api_key: str
    plan: str
    event_count: int


@router.post("/", response_model=TenantResponse, summary="Register a new business account")
async def create_tenant(payload: CreateTenantRequest, db: Session = Depends(get_db)):
    tenant = Tenant(
        name=payload.name,
        api_key=generate_api_key(),
        plan=payload.plan,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        api_key=tenant.api_key,
        plan=tenant.plan,
        event_count=0,
    )


@router.get("/me", summary="Get current tenant info")
async def get_me(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    item_count = db.query(Item).filter_by(tenant_id=tenant.id).count()
    user_count = db.query(AppUser).filter_by(tenant_id=tenant.id).count()
    return {
        "id": tenant.id,
        "name": tenant.name,
        "plan": tenant.plan,
        "event_count": tenant.event_count,
        "item_count": item_count,
        "user_count": user_count,
        "is_active": tenant.is_active,
    }


# ── Data ingestion ─────────────────────────────────────────────────────────

@router.post("/upload/products", summary="Upload product catalogue (CSV/JSON/XLSX/Shopify/WooCommerce)")
async def upload_products(
    file: UploadFile = File(...),
    platform: Optional[str] = Form(None),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    raw = await file.read()
    ext = file.filename.split(".")[-1].lower() if file.filename else None
    products, warnings = ingestion.ingest_products(raw, format_hint=ext, platform_hint=platform)

    if not products:
        raise HTTPException(400, detail=f"No products parsed. Warnings: {warnings}")

    upserted = 0
    for i, prod in enumerate(products):
        existing = db.query(Item).filter_by(
            tenant_id=tenant.id, external_id=prod["external_id"]
        ).first()
        if existing:
            for k, v in prod.items():
                setattr(existing, k, v)
        else:
            count = db.query(Item).filter_by(tenant_id=tenant.id).count()
            db.add(Item(tenant_id=tenant.id, internal_idx=count, **prod))
            upserted += 1

    db.commit()

    # Refit content-based model
    all_items = db.query(Item).filter_by(tenant_id=tenant.id, is_active=True).all()
    item_dicts = [
        {
            "external_id": it.external_id, "title": it.title or "",
            "description": it.description or "", "category": it.category or "",
            "tags": it.tags or [], "price": it.price or 0, "attributes": it.attributes or {},
        }
        for it in all_items
    ]

    from engine.api.routes.recommendations import content_rec
    if content_rec:
        content_rec.fit(item_dicts)

    return {
        "total_parsed": len(products),
        "upserted": upserted,
        "warnings": warnings,
    }


@router.post("/upload/events", summary="Upload historical events/orders (CSV/JSON/XLSX/Shopify/WooCommerce)")
async def upload_events(
    file: UploadFile = File(...),
    platform: Optional[str] = Form(None),
    trigger_training: bool = Form(True),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    raw = await file.read()
    ext = file.filename.split(".")[-1].lower() if file.filename else None
    events, warnings = ingestion.ingest_events(raw, format_hint=ext, platform_hint=platform)

    if not events:
        raise HTTPException(400, detail=f"No events parsed. Warnings: {warnings}")

    inserted = 0
    for ev in events:
        # Upsert user
        user = db.query(AppUser).filter_by(
            tenant_id=tenant.id, external_id=ev["user_external_id"]
        ).first()
        if not user:
            count = db.query(AppUser).filter_by(tenant_id=tenant.id).count()
            user = AppUser(
                tenant_id=tenant.id,
                external_id=ev["user_external_id"],
                internal_idx=count,
            )
            db.add(user)
        user.event_count = (user.event_count or 0) + 1

        db.add(Event(
            tenant_id=tenant.id,
            user_external_id=ev["user_external_id"],
            item_external_id=ev["item_external_id"],
            event_type=ev["event_type"],
            value=ev.get("value", 1.0),
            context=ev.get("context", {}),
        ))
        inserted += 1

    db.commit()

    result = {"total_parsed": len(events), "inserted": inserted, "warnings": warnings}

    if trigger_training:
        asyncio.create_task(_run_training_background(tenant.id, db))
        result["training"] = "started_in_background"

    return result


async def _run_training_background(tenant_id: str, db: Session):
    try:
        items = db.query(Item).filter_by(tenant_id=tenant_id, is_active=True).all()
        events = db.query(Event).filter_by(tenant_id=tenant_id).all()
        item_dicts = [{"external_id": it.external_id} for it in items]
        event_dicts = [
            {
                "user_external_id": ev.user_external_id,
                "item_external_id": ev.item_external_id,
                "event_type": ev.event_type,
                "value": ev.value,
                "created_at": ev.created_at.isoformat() if ev.created_at else "",
            }
            for ev in events
        ]
        trainer = ModelTrainer(model_store)
        trainer.train_all(tenant_id, item_dicts, event_dicts)

        # Wire up ensemble
        from engine.api.routes.recommendations import ensemble
        if ensemble:
            ensemble.register_item_map(
                tenant_id,
                model_store.item_id_to_idx.get(tenant_id, {}),
                model_store.item_idx_to_id.get(tenant_id, {}),
            )
            if tenant_id in model_store.ncf:
                ensemble.ncf = model_store.ncf[tenant_id]
            if tenant_id in model_store.lightgcn:
                ensemble.lightgcn = model_store.lightgcn[tenant_id]
            if tenant_id in model_store.session:
                ensemble.session = model_store.session[tenant_id]

        logger.info(f"[{tenant_id}] Background training complete.")
    except Exception as e:
        logger.error(f"[{tenant_id}] Background training failed: {e}")


@router.post("/train", summary="Manually trigger model retraining")
async def trigger_training(
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    asyncio.create_task(_run_training_background(tenant.id, db))
    return {"status": "training_started"}
