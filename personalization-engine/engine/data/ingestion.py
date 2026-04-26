"""
Unstructured Data Ingestion Pipeline
Accepts CSV, JSON, JSONL, Excel, and raw event log formats.
Auto-detects schema, maps to internal format, and returns structured records.
Supports Shopify exports, WooCommerce exports, and generic e-commerce formats.
"""
import json
import csv
import io
import re
import chardet
import pandas as pd
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime


# ── Schema mappings for known platforms ───────────────────────────────────

SHOPIFY_PRODUCT_MAP = {
    "Handle": "external_id",
    "Title": "title",
    "Body (HTML)": "description",
    "Vendor": "brand",
    "Type": "category",
    "Tags": "tags",
    "Variant Price": "price",
    "Image Src": "image_url",
}

WOOCOMMERCE_PRODUCT_MAP = {
    "ID": "external_id",
    "Name": "title",
    "Description": "description",
    "Short description": "short_description",
    "Categories": "category",
    "Tags": "tags",
    "Regular price": "price",
    "Images": "image_url",
    "SKU": "sku",
}

SHOPIFY_ORDER_MAP = {
    "Name": "order_id",
    "Email": "user_email",
    "Created at": "created_at",
    "Lineitem name": "item_title",
    "Lineitem sku": "item_external_id",
    "Lineitem price": "price",
    "Lineitem quantity": "quantity",
}

EVENT_TYPE_MAP = {
    # Raw strings → normalised event types
    "view": "view", "viewed": "view", "product_view": "view", "page_view": "view",
    "click": "click", "clicked": "click", "product_click": "click",
    "add_to_cart": "add_to_cart", "cart": "add_to_cart", "atc": "add_to_cart",
    "purchase": "purchase", "bought": "purchase", "order": "purchase", "buy": "purchase",
    "like": "like", "favourite": "like", "favorite": "like", "wishlist": "like",
    "share": "share", "shared": "share",
    "rating": "rating", "rate": "rating", "review": "rating",
}


def _detect_encoding(raw: bytes) -> str:
    result = chardet.detect(raw[:10_000])
    return result.get("encoding") or "utf-8"


def _clean_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-z]+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_tags(raw) -> List[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(t).strip() for t in raw if t]
    return [t.strip() for t in str(raw).split(",") if t.strip()]


def _parse_price(raw) -> float:
    if raw is None:
        return 0.0
    try:
        return float(re.sub(r"[^\d.]", "", str(raw)) or 0)
    except (ValueError, TypeError):
        return 0.0


def _normalise_event_type(raw: str) -> str:
    return EVENT_TYPE_MAP.get(raw.lower().strip(), "view")


# ── Core ingestion functions ───────────────────────────────────────────────

class DataIngestionPipeline:
    """Accepts raw bytes / file path / dicts and returns normalised records."""

    # ── Products ──────────────────────────────────────────────────────────

    def ingest_products(
        self,
        source: Any,
        format_hint: Optional[str] = None,
        platform_hint: Optional[str] = None,
    ) -> Tuple[List[dict], List[str]]:
        """
        Returns (products, warnings).
        source: bytes | str (file path) | List[dict] | pd.DataFrame
        """
        df = self._to_dataframe(source, format_hint)
        platform = platform_hint or self._detect_platform(df)
        df = self._remap_columns(df, platform)
        products, warnings = self._normalise_products(df)
        return products, warnings

    def _detect_platform(self, df: pd.DataFrame) -> str:
        cols = set(df.columns.str.strip())
        if "Handle" in cols and "Variant Price" in cols:
            return "shopify"
        if "Regular price" in cols and "Short description" in cols:
            return "woocommerce"
        return "generic"

    def _remap_columns(self, df: pd.DataFrame, platform: str) -> pd.DataFrame:
        mapping = {
            "shopify": SHOPIFY_PRODUCT_MAP,
            "woocommerce": WOOCOMMERCE_PRODUCT_MAP,
        }.get(platform, {})
        if mapping:
            df = df.rename(columns={k: v for k, v in mapping.items() if k in df.columns})
        # Lower-case all remaining columns for generic matching
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        return df

    def _normalise_products(self, df: pd.DataFrame) -> Tuple[List[dict], List[str]]:
        warnings = []
        products = []
        col_candidates = {
            "external_id": ["external_id", "id", "sku", "product_id", "handle", "slug"],
            "title": ["title", "name", "product_name", "item_name"],
            "description": ["description", "body_(html)", "content", "short_description", "details"],
            "category": ["category", "type", "product_type", "department", "categories"],
            "tags": ["tags", "tag", "labels"],
            "price": ["price", "variant_price", "regular_price", "sale_price", "cost"],
            "image_url": ["image_url", "image_src", "images", "photo", "thumbnail"],
            "url": ["url", "link", "product_url", "permalink"],
        }

        def find_col(key):
            for candidate in col_candidates[key]:
                if candidate in df.columns:
                    return candidate
            return None

        id_col = find_col("external_id")
        if id_col is None:
            # Auto-generate IDs
            df["external_id"] = [f"item_{i}" for i in range(len(df))]
            warnings.append("No ID column found; auto-generated external_ids.")
            id_col = "external_id"

        for _, row in df.iterrows():
            product = {
                "external_id": str(row.get(id_col, "")).strip(),
                "title": str(row.get(find_col("title") or "", "") or "").strip(),
                "description": _clean_html(str(row.get(find_col("description") or "", "") or "")),
                "category": str(row.get(find_col("category") or "", "") or "").strip(),
                "tags": _parse_tags(row.get(find_col("tags") or "")),
                "price": _parse_price(row.get(find_col("price") or "")),
                "image_url": str(row.get(find_col("image_url") or "", "") or "").strip(),
                "url": str(row.get(find_col("url") or "", "") or "").strip(),
                "attributes": {},
            }
            if not product["external_id"]:
                warnings.append(f"Skipped row with empty external_id: {dict(row)}")
                continue
            products.append(product)

        return products, warnings

    # ── Events / Orders ───────────────────────────────────────────────────

    def ingest_events(
        self,
        source: Any,
        format_hint: Optional[str] = None,
        platform_hint: Optional[str] = None,
    ) -> Tuple[List[dict], List[str]]:
        """
        Returns (events, warnings).
        Accepts order exports (Shopify, WooCommerce) or raw event logs.
        """
        df = self._to_dataframe(source, format_hint)
        platform = platform_hint or self._detect_event_platform(df)

        if platform == "shopify_orders":
            return self._parse_shopify_orders(df)
        if platform == "woocommerce_orders":
            return self._parse_woocommerce_orders(df)
        return self._parse_generic_events(df)

    def _detect_event_platform(self, df: pd.DataFrame) -> str:
        cols = set(df.columns.str.strip())
        if "Lineitem sku" in cols or "Lineitem name" in cols:
            return "shopify_orders"
        if "Order ID" in cols and "Product" in cols:
            return "woocommerce_orders"
        return "generic"

    def _parse_shopify_orders(self, df: pd.DataFrame) -> Tuple[List[dict], List[str]]:
        warnings = []
        events = []
        df = df.rename(columns={k: v for k, v in SHOPIFY_ORDER_MAP.items() if k in df.columns})
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        for _, row in df.iterrows():
            user_id = str(row.get("user_email", row.get("customer_email", "")) or "").strip()
            item_id = str(row.get("item_external_id", row.get("lineitem_sku", "")) or "").strip()
            if not user_id or not item_id:
                continue
            raw_date = row.get("created_at", "")
            try:
                ts = pd.to_datetime(raw_date).isoformat()
            except Exception:
                ts = datetime.utcnow().isoformat()

            events.append({
                "user_external_id": user_id,
                "item_external_id": item_id,
                "event_type": "purchase",
                "value": _parse_price(row.get("price", 0)),
                "created_at": ts,
                "context": {"source": "shopify_order"},
            })
        return events, warnings

    def _parse_woocommerce_orders(self, df: pd.DataFrame) -> Tuple[List[dict], List[str]]:
        warnings = []
        events = []
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        for _, row in df.iterrows():
            user_id = str(row.get("billing_email", row.get("customer_email", "")) or "").strip()
            item_id = str(row.get("sku", row.get("product_id", "")) or "").strip()
            if not user_id or not item_id:
                continue
            raw_date = row.get("date", row.get("order_date", ""))
            try:
                ts = pd.to_datetime(raw_date).isoformat()
            except Exception:
                ts = datetime.utcnow().isoformat()

            events.append({
                "user_external_id": user_id,
                "item_external_id": item_id,
                "event_type": "purchase",
                "value": _parse_price(row.get("total", 0)),
                "created_at": ts,
                "context": {"source": "woocommerce_order"},
            })
        return events, warnings

    def _parse_generic_events(self, df: pd.DataFrame) -> Tuple[List[dict], List[str]]:
        warnings = []
        events = []
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        col_map = {
            "user_id": ["user_id", "user_external_id", "customer_id", "visitor_id", "email"],
            "item_id": ["item_id", "item_external_id", "product_id", "sku", "content_id"],
            "event_type": ["event_type", "event", "action", "interaction", "type"],
            "value": ["value", "price", "amount", "rating", "score"],
            "created_at": ["created_at", "timestamp", "date", "time", "event_time"],
        }

        def find(key):
            for c in col_map[key]:
                if c in df.columns:
                    return c
            return None

        uid_col = find("user_id")
        iid_col = find("item_id")
        if not uid_col or not iid_col:
            warnings.append("Could not find user_id or item_id columns.")
            return events, warnings

        et_col = find("event_type")
        val_col = find("value")
        ts_col = find("created_at")

        for _, row in df.iterrows():
            user_id = str(row.get(uid_col, "") or "").strip()
            item_id = str(row.get(iid_col, "") or "").strip()
            if not user_id or not item_id:
                continue

            raw_et = str(row.get(et_col, "view") if et_col else "view").strip()
            raw_ts = row.get(ts_col, "") if ts_col else ""
            try:
                ts = pd.to_datetime(raw_ts).isoformat()
            except Exception:
                ts = datetime.utcnow().isoformat()

            events.append({
                "user_external_id": user_id,
                "item_external_id": item_id,
                "event_type": _normalise_event_type(raw_et),
                "value": _parse_price(row.get(val_col, 1.0) if val_col else 1.0),
                "created_at": ts,
                "context": {},
            })
        return events, warnings

    # ── Unified file reader ────────────────────────────────────────────────

    def _to_dataframe(self, source: Any, format_hint: Optional[str] = None) -> pd.DataFrame:
        if isinstance(source, pd.DataFrame):
            return source.copy()

        if isinstance(source, list):
            return pd.DataFrame(source)

        # Bytes or file path
        if isinstance(source, (str, Path)):
            source = Path(source).read_bytes()

        assert isinstance(source, (bytes, bytearray)), "source must be bytes, path, list, or DataFrame"

        encoding = _detect_encoding(source)
        ext = (format_hint or "").lower()

        # Excel
        if ext in ("xlsx", "xls") or source[:4] in (b"PK\x03\x04", b"\xd0\xcf\x11\xe0"):
            return pd.read_excel(io.BytesIO(source))

        # JSON / JSONL
        text = source.decode(encoding, errors="replace")
        stripped = text.strip()
        if ext == "jsonl" or (stripped.startswith("{") and "\n{" in stripped):
            records = [json.loads(line) for line in stripped.splitlines() if line.strip()]
            return pd.DataFrame(records)
        if ext == "json" or stripped.startswith("[") or stripped.startswith("{"):
            try:
                data = json.loads(stripped)
                if isinstance(data, list):
                    return pd.DataFrame(data)
                if isinstance(data, dict):
                    # Try common wrapper keys
                    for key in ("products", "items", "events", "orders", "data", "results"):
                        if key in data and isinstance(data[key], list):
                            return pd.DataFrame(data[key])
                    return pd.DataFrame([data])
            except json.JSONDecodeError:
                pass

        # CSV (default)
        return pd.read_csv(io.StringIO(text))
