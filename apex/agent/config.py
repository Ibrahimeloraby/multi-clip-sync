"""
APEX.AI — centralised settings loaded from environment variables.
All modules import `settings` from here; never read os.environ directly.
"""

from __future__ import annotations

from typing import Any, List, Type
from pydantic import field_validator
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings.sources import DotEnvSettingsSource, EnvSettingsSource


class _FlexEnvSource(EnvSettingsSource):
    def prepare_field_value(self, field_name: str, field: FieldInfo, value: Any, value_is_complex: bool) -> Any:
        if isinstance(value, str) and value_is_complex and not value.strip().startswith(("[", "{")):
            return value
        return super().prepare_field_value(field_name, field, value, value_is_complex)


class _FlexDotEnvSource(DotEnvSettingsSource):
    def prepare_field_value(self, field_name: str, field: FieldInfo, value: Any, value_is_complex: bool) -> Any:
        if isinstance(value, str) and value_is_complex and not value.strip().startswith(("[", "{")):
            return value
        return super().prepare_field_value(field_name, field, value, value_is_complex)


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

    # ── Safety ───────────────────────────────────────────────────────
    # DRY_RUN=true  → full pipeline runs but NO orders are submitted to IBKR.
    # All signals, risk checks, and sizing are logged as if real.
    # Set to false only when you are ready to trade real/paper money.
    dry_run: bool = True

    # Stop-loss / take-profit (applied to every bracket order)
    stop_loss_pct: float = 0.02       # 2% below entry → stop
    take_profit_pct: float = 0.04     # 4% above entry → limit sell (2:1 R:R)

    # Allow opening short positions (SELL with no existing long)
    allow_shorting: bool = False

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

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings,
        env_settings,
        dotenv_settings,
        secrets_settings,
    ):
        return (
            init_settings,
            _FlexEnvSource(settings_cls),
            _FlexDotEnvSource(settings_cls, env_file=".env", env_file_encoding="utf-8"),
            secrets_settings,
        )


settings = Settings()
