from openai import AsyncOpenAI

from app.core.config import settings

_client = AsyncOpenAI(
    api_key=settings.grok_API,
    base_url="https://api.x.ai/v1",
)


embed_client = AsyncOpenAI(
    api_key=settings.EMBEDDING_API_KEY or settings.grok_API,
    base_url=settings.EMBEDDING_BASE_URL,
)

async def embed(text: str) -> list[float]:
    resp = await _client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text.strip()[:8000],
    )
    return resp.data[0].embedding
