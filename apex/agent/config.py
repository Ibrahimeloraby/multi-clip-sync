"""
APEX.AI — centralised settings loaded from environment variables.
All modules import `settings` from here; never read os.environ directly.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


def _parse_symbols() -> List[str]:
    raw = os.getenv("SYMBOLS", "AAPL,TSLA,NVDA,MSFT,AMZN,GOOGL")
    return [s.strip().upper() for s in raw.split(",") if s.strip()]


def _getbool(key: str, default: bool) -> bool:
    v = os.getenv(key, str(default)).strip().lower()
    return v in ("1", "true", "yes")


def _getfloat(key: str, default: float) -> float:
    try:
        return float(os.getenv(key, str(default)))
    except ValueError:
        return default


def _getint(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, str(default)))
    except ValueError:
        return default


class Settings:
    # ── Anthropic ─────────────────────────────────────────────────────
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

    # ── IBKR ─────────────────────────────────────────────────────────
    ibkr_host: str = os.getenv("IBKR_HOST", "127.0.0.1")
    ibkr_port: int = _getint("IBKR_PORT", 4002)
    ibkr_client_id: int = _getint("IBKR_CLIENT_ID", 1)

    # ── Social / News APIs ───────────────────────────────────────────
    twitter_bearer_token: str = os.getenv("TWITTER_BEARER_TOKEN", "")
    reddit_client_id: str = os.getenv("REDDIT_CLIENT_ID", "")
    reddit_client_secret: str = os.getenv("REDDIT_CLIENT_SECRET", "")
    reddit_user_agent: str = os.getenv("REDDIT_USER_AGENT", "APEX.AI/1.0")
    news_api_key: str = os.getenv("NEWS_API_KEY", "")

    # ── Trading universe ─────────────────────────────────────────────
    symbols: List[str] = _parse_symbols()
    account_currency: str = os.getenv("ACCOUNT_CURRENCY", "AED")

    # ── Risk parameters ──────────────────────────────────────────────
    max_position_size_pct: float = _getfloat("MAX_POSITION_SIZE_PCT", 0.05)
    max_daily_loss_pct: float = _getfloat("MAX_DAILY_LOSS_PCT", 0.02)
    max_drawdown_pct: float = _getfloat("MAX_DRAWDOWN_PCT", 0.10)
    min_sentiment_confidence: float = _getfloat("MIN_SENTIMENT_CONFIDENCE", 0.60)

    # ── Safety ───────────────────────────────────────────────────────
    dry_run: bool = _getbool("DRY_RUN", True)
    stop_loss_pct: float = _getfloat("STOP_LOSS_PCT", 0.02)
    take_profit_pct: float = _getfloat("TAKE_PROFIT_PCT", 0.04)
    allow_shorting: bool = _getbool("ALLOW_SHORTING", False)

    # ── Agent loop ───────────────────────────────────────────────────
    loop_interval_seconds: int = _getint("LOOP_INTERVAL_SECONDS", 60)

    # ── WebSocket ────────────────────────────────────────────────────
    ws_host: str = os.getenv("WS_HOST", "0.0.0.0")
    ws_port: int = _getint("WS_PORT", 8765)


settings = Settings()
