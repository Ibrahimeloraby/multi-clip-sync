from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "PersonalizeAI"
    API_VERSION: str = "v1"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-use-long-random-string"
    ALLOWED_ORIGINS: List[str] = ["*"]

    DATABASE_URL: str = "sqlite:///./personalizeai.db"
    REDIS_URL: str = "redis://localhost:6379"

    # Model hyperparameters
    NCF_EMBED_DIM: int = 64
    NCF_MLP_LAYERS: List[int] = [128, 64, 32]
    LIGHTGCN_EMBED_DIM: int = 64
    LIGHTGCN_NUM_LAYERS: int = 3
    SESSION_EMBED_DIM: int = 64
    SESSION_HIDDEN_SIZE: int = 128
    SESSION_NUM_LAYERS: int = 2
    SESSION_MAX_LENGTH: int = 50
    SESSION_TIMEOUT_MINUTES: int = 30

    # Training
    BATCH_SIZE: int = 256
    LEARNING_RATE: float = 0.001
    NUM_EPOCHS: int = 20
    NEGATIVE_SAMPLES: int = 4
    MIN_INTERACTIONS_FOR_NCF: int = 5
    RETRAIN_INTERVAL_HOURS: int = 24

    # Inference
    CANDIDATE_POOL_SIZE: int = 200
    DEFAULT_TOP_K: int = 10
    DIVERSITY_LAMBDA: float = 0.3  # MMR diversity weight

    # Trending time-decay half-life in hours
    TRENDING_HALF_LIFE_HOURS: float = 24.0

    # Thompson sampling prior
    THOMPSON_ALPHA_PRIOR: float = 1.0
    THOMPSON_BETA_PRIOR: float = 1.0

    # Ensemble weights by user maturity tier
    # cold (0-5 events), warm (6-50), hot (51+)
    WEIGHTS_COLD: dict = {
        "trending": 0.40,
        "content": 0.30,
        "session": 0.20,
        "thompson": 0.10,
        "ncf": 0.00,
        "lightgcn": 0.00,
    }
    WEIGHTS_WARM: dict = {
        "session": 0.30,
        "ncf": 0.20,
        "content": 0.20,
        "trending": 0.15,
        "thompson": 0.10,
        "lightgcn": 0.05,
    }
    WEIGHTS_HOT: dict = {
        "ncf": 0.30,
        "lightgcn": 0.25,
        "session": 0.20,
        "thompson": 0.10,
        "trending": 0.10,
        "content": 0.05,
    }

    class Config:
        env_file = ".env"


settings = Settings()
