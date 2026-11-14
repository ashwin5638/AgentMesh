from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL : str
    REDIS_URL : str
    grok_API : str
    EMBEDDING_MODEL : str
    VECTOR_TOP_K : int
    RELEVANCE_THRESHOLD : float
    VECTOR_TOP_K: int = 50
    RELEVANCE_THRESHOLD: float = 0.75
    WEBHOOK_TIMEOUT: float = 10.0
    model_config = SettingsConfigDict(env_file=".env")



Settings = Settings()