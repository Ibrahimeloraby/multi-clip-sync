"""
APEX.AI — centralised settings loaded from environment variables.
All modules import `settings` from here; never read os.environ directly.
"""

from __future__ import annotations

from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Anthropic ─────────────────────────────────────────────────────
    anthropic_api_key: str

    # ── IBKR ─────────────────────────────────────────────────────────
    ibkr_host: str = "127.0.0.1"
    ibkr_port: int = 4002          # 4002 = IB Gateway live; 7497 = TWS paper
    ibkr_client_id: int = 1

    # ── Social / News APIs ───────────────────────────────────────────
    twitter_bearer_token: str = ""
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "APEX.AI/1.0"
    news_api_key: str = ""

    # ── Trading universe ─────────────────────────────────────────────
    symbols: List[str] = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL"]
    account_currency: str = "AED"

    # ── Risk parameters ──────────────────────────────────────────────
    max_position_size_pct: float = 0.05    # 5% of portfolio per symbol
    max_daily_loss_pct: float = 0.02       # halt after 2% daily loss
    max_drawdown_pct: float = 0.10         # hard stop at 10% drawdown
    min_sentiment_confidence: float = 0.60 # skip signals below this threshold

    # ── Agent loop ───────────────────────────────────────────────────
    loop_interval_seconds: int = 60

    # ── WebSocket ────────────────────────────────────────────────────
    ws_host: str = "0.0.0.0"
    ws_port: int = 8765

    @field_validator("symbols", mode="before")
    @classmethod
    def parse_symbols(cls, v):
        if isinstance(v, str):
            return [s.strip().upper() for s in v.split(",") if s.strip()]
        return v


settings = Settings()
