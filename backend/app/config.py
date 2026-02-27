from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    DATABASE_URL: str = "sqlite:///./data/budgetbolt.db"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"

    # Ollama / OpenAI-compatible local LLM
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    AI_ENABLED: bool = True
    AI_REQUEST_TIMEOUT: int = 120

    class Config:
        env_file = ".env"


settings = Settings()
