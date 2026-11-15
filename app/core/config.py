from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str

    # LLM / reranking (xAI Grok, OpenAI-compatible API)
    grok_API: str
    LLM_BASE_URL: str = "https://api.x.ai/v1"
    RERANK_MODEL: str = "grok-4"
    OPENAI_API_KEY: str | None = None

    # Embeddings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_API_KEY: str | None = None
    EMBEDDING_BASE_URL: str = "https://api.x.ai/v1"

    # Retrieval / delivery
    VECTOR_TOP_K: int = 50
    RELEVANCE_THRESHOLD: float = 0.75
    WEBHOOK_TIMEOUT: float = 10.0
    ALLOW_LOCAL_WEBHOOKS: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
