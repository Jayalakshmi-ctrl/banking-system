from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: SecretStr = Field(
        ...,
        alias="DATABASE_URL",
        description="Async PostgreSQL URL for SQLAlchemy",
    )
    service_name: str = Field(default="customer-service", alias="SERVICE_NAME")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")

    @property
    def database_url_str(self) -> str:
        return self.database_url.get_secret_value()


@lru_cache
def get_settings() -> Settings:
    return Settings()
