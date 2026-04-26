"""
PersonalizeAI Python Client SDK
Wrap all API calls for server-side integration (Django, Flask, custom backends).

pip install personalizeai-python
# or: pip install httpx

Usage:
    from personalizeai import PersonalizeClient
    client = PersonalizeClient(api_key="pk_live_xxx", base_url="https://api.personalizeai.com")
    recs = client.for_you(user_id="user_123", limit=10)
    client.track(user_id="user_123", item_id="sku-456", event_type="purchase", value=49.99)
"""
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime


class PersonalizeAIError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class PersonalizeClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.personalizeai.com",
        api_version: str = "v1",
        timeout: float = 5.0,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.api_version = api_version
        self._client = httpx.Client(
            base_url=f"{self.base_url}/api/{api_version}",
            headers={"X-API-Key": api_key, "Content-Type": "application/json"},
            timeout=timeout,
        )

    def _get(self, path: str, params: dict = None) -> dict:
        resp = self._client.get(path, params=params)
        if not resp.is_success:
            raise PersonalizeAIError(resp.text, resp.status_code)
        return resp.json()

    def _post(self, path: str, json: dict) -> dict:
        resp = self._client.post(path, json=json)
        if not resp.is_success:
            raise PersonalizeAIError(resp.text, resp.status_code)
        return resp.json()

    # ── Recommendations ──────────────────────────────────────────────────

    def for_you(
        self,
        user_id: str,
        limit: int = 10,
        exclude: Optional[List[str]] = None,
        include_item_data: bool = True,
    ) -> List[dict]:
        params = {"user_id": user_id, "limit": limit, "include_item_data": include_item_data}
        if exclude:
            params["exclude"] = ",".join(exclude)
        return self._get("/recommend/for-you", params)["recommendations"]

    def trending(
        self,
        user_id: str = "anonymous",
        limit: int = 10,
        category: Optional[str] = None,
        include_item_data: bool = True,
    ) -> List[dict]:
        params = {"user_id": user_id, "limit": limit, "include_item_data": include_item_data}
        if category:
            params["category"] = category
        return self._get("/recommend/trending", params)["recommendations"]

    def top(self, limit: int = 10, include_item_data: bool = True) -> List[dict]:
        return self._get("/recommend/top", {
            "limit": limit, "include_item_data": include_item_data
        })["recommendations"]

    def similar(
        self,
        item_id: str,
        user_id: str = "anonymous",
        limit: int = 10,
        include_item_data: bool = True,
    ) -> List[dict]:
        return self._get("/recommend/similar", {
            "item_id": item_id, "user_id": user_id,
            "limit": limit, "include_item_data": include_item_data
        })["recommendations"]

    def because_you_actioned(
        self,
        user_id: str,
        limit: int = 10,
        include_item_data: bool = True,
    ) -> List[dict]:
        return self._get("/recommend/because-you-actioned", {
            "user_id": user_id, "limit": limit, "include_item_data": include_item_data
        })["recommendations"]

    def continue_where_left_off(
        self,
        user_id: str,
        limit: int = 10,
        include_item_data: bool = True,
    ) -> List[dict]:
        return self._get("/recommend/continue", {
            "user_id": user_id, "limit": limit, "include_item_data": include_item_data
        })["recommendations"]

    def next_best_action(
        self,
        user_id: str,
        limit: int = 5,
        include_item_data: bool = True,
    ) -> List[dict]:
        return self._get("/recommend/next-best-action", {
            "user_id": user_id, "limit": limit, "include_item_data": include_item_data
        })["recommendations"]

    # ── Event Tracking ───────────────────────────────────────────────────

    def track(
        self,
        user_id: str,
        item_id: str,
        event_type: str,
        value: float = 1.0,
        session_id: Optional[str] = None,
        context: Optional[dict] = None,
    ) -> dict:
        return self._post("/events/track", {
            "user_id": user_id,
            "item_id": item_id,
            "event_type": event_type,
            "value": value,
            "session_id": session_id,
            "context": context or {},
        })

    def track_batch(self, events: List[dict]) -> dict:
        """Track up to 500 events in one API call."""
        return self._post("/events/batch", {"events": events})

    def track_view(self, user_id: str, item_id: str, **kwargs) -> dict:
        return self.track(user_id, item_id, "view", **kwargs)

    def track_click(self, user_id: str, item_id: str, **kwargs) -> dict:
        return self.track(user_id, item_id, "click", **kwargs)

    def track_purchase(self, user_id: str, item_id: str, value: float, **kwargs) -> dict:
        return self.track(user_id, item_id, "purchase", value=value, **kwargs)

    def track_add_to_cart(self, user_id: str, item_id: str, **kwargs) -> dict:
        return self.track(user_id, item_id, "add_to_cart", **kwargs)

    # ── Analytics ────────────────────────────────────────────────────────

    def overview(self, days: int = 30) -> dict:
        return self._get("/analytics/overview", {"days": days})

    def top_items(self, metric: str = "purchases", limit: int = 10, days: int = 30) -> List[dict]:
        return self._get("/analytics/top-items", {"metric": metric, "limit": limit, "days": days})

    def funnel(self, days: int = 30) -> dict:
        return self._get("/analytics/engagement-funnel", {"days": days})

    def user_segments(self) -> dict:
        return self._get("/analytics/user-segments")

    # ── Context manager ──────────────────────────────────────────────────

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self._client.close()

    def close(self):
        self._client.close()


# ── Async variant ─────────────────────────────────────────────────────────

class AsyncPersonalizeClient:
    """Async version for FastAPI / async Django."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.personalizeai.com",
        api_version: str = "v1",
        timeout: float = 5.0,
    ):
        self._client = httpx.AsyncClient(
            base_url=f"{base_url.rstrip('/')}/api/{api_version}",
            headers={"X-API-Key": api_key, "Content-Type": "application/json"},
            timeout=timeout,
        )

    async def _get(self, path: str, params: dict = None) -> dict:
        resp = await self._client.get(path, params=params)
        if not resp.is_success:
            raise PersonalizeAIError(resp.text, resp.status_code)
        return resp.json()

    async def _post(self, path: str, json: dict) -> dict:
        resp = await self._client.post(path, json=json)
        if not resp.is_success:
            raise PersonalizeAIError(resp.text, resp.status_code)
        return resp.json()

    async def for_you(self, user_id: str, limit: int = 10, include_item_data: bool = True) -> List[dict]:
        return (await self._get("/recommend/for-you", {
            "user_id": user_id, "limit": limit, "include_item_data": include_item_data
        }))["recommendations"]

    async def track(self, user_id: str, item_id: str, event_type: str, value: float = 1.0, **kwargs) -> dict:
        return await self._post("/events/track", {
            "user_id": user_id, "item_id": item_id,
            "event_type": event_type, "value": value,
            "context": kwargs.get("context", {}),
        })

    async def close(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        await self.close()
