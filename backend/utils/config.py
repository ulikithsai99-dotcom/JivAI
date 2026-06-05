"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "JivAI Backend"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    rag_index_dir: Path = Path(__file__).resolve().parent.parent / "rag" / "index"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    bhashini_api_key: str | None = None
    bhashini_user_id: str | None = None
    maps_api_key: str | None = None

    use_mock_translation: bool = True
    use_mock_gemini: bool = True
    use_mock_maps: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
