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
    
    model_config = {"env_prefix": ""}


# Global settings instance
settings = Settings()
