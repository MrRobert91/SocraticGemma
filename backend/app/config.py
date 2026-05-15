"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    openrouter_api_key: str = ""
    gemma_model_fast: str = "google/gemma-4-26b-a4b-it"
    gemma_model_accurate: str = "google/gemma-4-31b-it"
    session_ttl_hours: int = 4
    rag_enabled: bool = False
    debug_prompts: bool = False
    evaluator_model: str = "google/gemma-4-26b-a4b-it"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Authentication
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION_USE_A_RANDOM_32_CHAR_SECRET"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72

    # CORS — comma-separated list of allowed frontend origins
    cors_origins: str = "https://socraticgemma-js7p6v.sliplane.app,http://localhost:3000"
    
    model_config = {"env_prefix": ""}


# Global settings instance
settings = Settings()
