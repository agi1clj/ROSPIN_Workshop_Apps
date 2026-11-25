"""Application settings, read once from environment variables.

Azure supplies them as environment variables managed by Terraform;
Docker Compose supplies them locally. Add new settings here.
"""

import os
from dataclasses import dataclass, field
from functools import lru_cache


def _split_csv(value: str) -> list[str]:
    return [item.strip().rstrip("/") for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "rospin-ndvi-api"
    # Git commit SHA, baked into the image at build time (see Dockerfile).
    app_version: str = field(default_factory=lambda: os.getenv("APP_VERSION", "local"))
    # Browser origins allowed to call the API.
    cors_origins: list[str] = field(
        default_factory=lambda: _split_csv(os.getenv("CORS_ORIGINS", "http://localhost:3000"))
    )
    # Public Sentinel-2 catalogue (STAC API). No account or key needed.
    stac_url: str = field(
        default_factory=lambda: os.getenv("STAC_URL", "https://earth-search.aws.element84.com/v1")
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
