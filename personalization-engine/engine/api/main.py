"""
PersonalizeAI — FastAPI application entry point
Boots all engines, registers routes, starts the retraining scheduler.
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from engine.core.config import settings
from engine.core.database import init_db, SessionLocal, Item, Event, ItemStats, BanditState
from engine.models.trending import TrendingEngine
from engine.models.thompson_bandit import ThompsonBanditEngine
from engine.models.content_based import ContentBasedRecommender
from engine.models.ensemble import MasterEnsemble
from engine.training.trainer import ModelTrainer, model_store
import engine.api.routes.events as events_route
import engine.api.routes.recommendations as recs_route

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Boot sequence: init DB → build engines → warm models → start scheduler."""
    logger.info("PersonalizeAI starting up...")
    init_db()

    # ── Shared engine singletons ─────────────────────────────────────────
    trending = TrendingEngine(half_life_hours=settings.TRENDING_HALF_LIFE_HOURS)
    bandit = ThompsonBanditEngine(
        alpha_prior=settings.THOMPSON_ALPHA_PRIOR,
        beta_prior=settings.THOMPSON_BETA_PRIOR,
    )
    content = ContentBasedRecommender()

    ensemble = MasterEnsemble(
        trending_engine=trending,
        bandit_engine=bandit,
        content_recommender=content,
    )

    # ── Inject into routes ───────────────────────────────────────────────
    events_route.trending_engine = trending
    events_route.bandit_engine = bandit
    recs_route.ensemble = ensemble
    recs_route.trending_engine = trending
    recs_route.bandit_engine = bandit
    recs_route.content_rec = content

    # ── Warm up: hydrate trending + bandit from DB ───────────────────────
    db = SessionLocal()
    try:
        _warm_up(db, trending, bandit, content, ensemble)
    finally:
        db.close()

    # ── Retraining scheduler ──────────────────────────────────────────────
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _retrain_all_tenants,
        "interval",
        hours=settings.RETRAIN_INTERVAL_HOURS,
        args=[ensemble],
    )
    scheduler.start()
    app.state.scheduler = scheduler

    logger.info("PersonalizeAI ready.")
    yield

    scheduler.shutdown()
    logger.info("PersonalizeAI shut down.")


def _warm_up(db, trending, bandit, content, ensemble):
    from engine.core.database import Tenant

    tenants = db.query(Tenant).filter_by(is_active=True).all()
    for tenant in tenants:
        tid = tenant.id

        # Load trending stats
        stats = db.query(ItemStats).filter_by(tenant_id=tid).all()
        for s in stats:
            from datetime import datetime
            item = db.query(Item).filter_by(tenant_id=tid, external_id=s.item_external_id).first()
            trending.upsert(
                tid, s.item_external_id,
                views=s.views or 0,
                clicks=s.clicks or 0,
                purchases=s.purchases or 0,
                likes=s.likes or 0,
                last_interaction=s.last_interaction_at or datetime.utcnow(),
                category=item.category if item else "",
            )

        # Load bandit state
        arms = db.query(BanditState).filter_by(tenant_id=tid).all()
        bandit.load_from_db_rows(tid, [
            {"item_external_id": a.item_external_id, "alpha": a.alpha,
             "beta": a.beta, "impressions": a.impressions, "conversions": a.conversions}
            for a in arms
        ])

        # Fit content model
        items = db.query(Item).filter_by(tenant_id=tid, is_active=True).all()
        if items:
            item_dicts = [
                {
                    "external_id": it.external_id, "title": it.title or "",
                    "description": it.description or "", "category": it.category or "",
                    "tags": it.tags or [], "price": it.price or 0, "attributes": it.attributes or {},
                }
                for it in items
            ]
            content.fit(item_dicts)
            ensemble.register_item_map(
                tid,
                {it.external_id: (it.internal_idx or i) for i, it in enumerate(items)},
                {(it.internal_idx or i): it.external_id for i, it in enumerate(items)},
            )

        # Load trained models if checkpoints exist
        base = f"./models/{tid}"
        trainer = ModelTrainer(model_store)
        if os.path.exists(f"{base}/ncf.pt") and items:
            try:
                from engine.models.ncf import NeuMF, NCFRecommender
                from engine.core.database import AppUser
                num_users = db.query(AppUser).filter_by(tenant_id=tid).count()
                num_items = len(items)
                m = NeuMF(num_users, num_items, settings.NCF_EMBED_DIM, settings.NCF_EMBED_DIM, settings.NCF_MLP_LAYERS)
                import torch
                m.load_state_dict(torch.load(f"{base}/ncf.pt", map_location="cpu"))
                model_store.ncf[tid] = NCFRecommender(m)
                ensemble.ncf = model_store.ncf[tid]
            except Exception as e:
                logger.warning(f"[{tid}] Could not load NCF checkpoint: {e}")

        logger.info(f"[{tid}] Warmed up: {len(items)} items, {len(arms)} bandit arms")


async def _retrain_all_tenants(ensemble: MasterEnsemble):
    from engine.core.database import Tenant
    db = SessionLocal()
    try:
        tenants = db.query(Tenant).filter_by(is_active=True).all()
        for tenant in tenants:
            try:
                items = db.query(Item).filter_by(tenant_id=tenant.id, is_active=True).all()
                events = db.query(Event).filter_by(tenant_id=tenant.id).all()
                if not items or not events:
                    continue
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
                trainer.train_all(tenant.id, item_dicts, event_dicts)
                ensemble.register_item_map(
                    tenant.id,
                    model_store.item_id_to_idx.get(tenant.id, {}),
                    model_store.item_idx_to_id.get(tenant.id, {}),
                )
                if tenant.id in model_store.ncf:
                    ensemble.ncf = model_store.ncf[tenant.id]
                if tenant.id in model_store.lightgcn:
                    ensemble.lightgcn = model_store.lightgcn[tenant.id]
                if tenant.id in model_store.session:
                    ensemble.session = model_store.session[tenant.id]
            except Exception as e:
                logger.error(f"[{tenant.id}] Scheduled retrain failed: {e}")
    finally:
        db.close()


# ── App factory ────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="PersonalizeAI",
        description="Master Personalization Engine for small businesses",
        version=settings.API_VERSION,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from engine.api.routes import events, recommendations, analytics, tenants
    app.include_router(tenants.router, prefix=f"/api/{settings.API_VERSION}")
    app.include_router(events.router, prefix=f"/api/{settings.API_VERSION}")
    app.include_router(recommendations.router, prefix=f"/api/{settings.API_VERSION}")
    app.include_router(analytics.router, prefix=f"/api/{settings.API_VERSION}")

    @app.get("/health")
    def health():
        return {"status": "ok", "version": settings.API_VERSION}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("engine.api.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
