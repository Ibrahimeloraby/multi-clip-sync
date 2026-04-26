from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean,
    DateTime, Text, JSON, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

from engine.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)


# ── Tenant (Small Business) ────────────────────────────────────────────────
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    api_key = Column(String, unique=True, nullable=False)
    plan = Column(String, default="starter")  # free | starter | growth | pro
    event_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    settings = Column(JSON, default={})

    items = relationship("Item", back_populates="tenant", cascade="all, delete-orphan")
    users = relationship("AppUser", back_populates="tenant", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="tenant", cascade="all, delete-orphan")


# ── Item (Product / Content) ───────────────────────────────────────────────
class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    external_id = Column(String, nullable=False)
    title = Column(String)
    description = Column(Text)
    category = Column(String)
    subcategory = Column(String)
    tags = Column(JSON, default=[])
    price = Column(Float, default=0.0)
    image_url = Column(String)
    url = Column(String)
    attributes = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    internal_idx = Column(Integer)  # numeric index for ML models
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="items")

    __table_args__ = (
        UniqueConstraint("tenant_id", "external_id"),
        Index("idx_items_tenant", "tenant_id"),
    )


# ── App User ───────────────────────────────────────────────────────────────
class AppUser(Base):
    __tablename__ = "app_users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    external_id = Column(String, nullable=False)
    attributes = Column(JSON, default={})
    event_count = Column(Integer, default=0)
    internal_idx = Column(Integer)  # numeric index for ML models
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")

    __table_args__ = (
        UniqueConstraint("tenant_id", "external_id"),
        Index("idx_users_tenant", "tenant_id"),
    )


# ── Interaction Event ──────────────────────────────────────────────────────
class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    user_external_id = Column(String, nullable=False)
    item_external_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)  # view|click|add_to_cart|purchase|like|share|rating
    value = Column(Float, default=1.0)  # rating value, purchase amount, etc.
    session_id = Column(String)
    context = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="events")

    __table_args__ = (
        Index("idx_events_tenant_user", "tenant_id", "user_external_id"),
        Index("idx_events_tenant_item", "tenant_id", "item_external_id"),
        Index("idx_events_created", "created_at"),
    )


# ── Item Stats (for Trending) ──────────────────────────────────────────────
class ItemStats(Base):
    __tablename__ = "item_stats"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False)
    item_external_id = Column(String, nullable=False)
    views = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    purchases = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    revenue = Column(Float, default=0.0)
    wilson_score = Column(Float, default=0.0)
    trending_score = Column(Float, default=0.0)
    last_interaction_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("tenant_id", "item_external_id"),
        Index("idx_stats_trending", "tenant_id", "trending_score"),
    )


# ── Thompson Bandit State (per item per tenant) ────────────────────────────
class BanditState(Base):
    __tablename__ = "bandit_states"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False)
    item_external_id = Column(String, nullable=False)
    alpha = Column(Float, default=1.0)  # successes + prior
    beta = Column(Float, default=1.0)   # failures + prior
    impressions = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "item_external_id"),)


# ── Model Checkpoint Metadata ──────────────────────────────────────────────
class ModelCheckpoint(Base):
    __tablename__ = "model_checkpoints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # ncf | lightgcn | session
    file_path = Column(String, nullable=False)
    num_users = Column(Integer)
    num_items = Column(Integer)
    metrics = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("idx_checkpoints_tenant_type", "tenant_id", "model_type"),)
