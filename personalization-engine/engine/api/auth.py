"""API key authentication for multi-tenant access."""
import secrets
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from engine.core.database import Tenant

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def generate_api_key() -> str:
    return "pk_live_" + secrets.token_urlsafe(32)


def get_tenant(
    api_key: str = Security(API_KEY_HEADER),
    db: Session = None,
) -> Tenant:
    if not api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")
    tenant = db.query(Tenant).filter(Tenant.api_key == api_key, Tenant.is_active == True).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    return tenant


def require_plan(min_plan: str):
    """Decorator-style dependency to enforce minimum plan tier."""
    PLAN_ORDER = {"free": 0, "starter": 1, "growth": 2, "pro": 3}

    def _check(tenant: Tenant = Security(get_tenant)):
        if PLAN_ORDER.get(tenant.plan, 0) < PLAN_ORDER.get(min_plan, 0):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"This feature requires the {min_plan} plan or higher.",
            )
        return tenant

    return _check
