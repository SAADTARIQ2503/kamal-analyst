from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_prefix="KT_", extra="ignore")

    db_user: str
    db_password: SecretStr
    db_dsn: str
    instant_client_dir: Path = PROJECT_DIR / "instantclient" / "instantclient_23_4"

    db_pool_min: int = 1
    db_pool_max: int = 4
    db_query_timeout_ms: int = 30_000
    db_row_limit: int = 5_000

    app_username: str
    app_password_hash: SecretStr
    session_secret: SecretStr
    session_https_only: bool = True
    cors_origins: list[str] = []

    anthropic_api_key: SecretStr | None = None
    ai_model: str = "claude-sonnet-5"
    ai_max_output_tokens: int = 500
    ai_daily_call_limit: int = 200
    ai_timeout_seconds: float = 30.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
