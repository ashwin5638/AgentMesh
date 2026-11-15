import hashlib
import logging
import math
from openai import AsyncOpenAI

from app.core.config import settings

log = logging.getLogger(__name__)

embed_client = AsyncOpenAI(
    api_key=settings.EMBEDDING_API_KEY or settings.grok_API,
    base_url=settings.EMBEDDING_BASE_URL,
)


def _deterministic_embedding(text: str, dim: int = 1536) -> list[float]:
    """Fallback 1536-dim unit vector generated deterministically from input text hash."""
    seed = hashlib.sha256(text.strip().encode("utf-8")).digest()
    vec = []
    for i in range(dim):
        h = hashlib.sha256(seed + i.to_bytes(2, "big")).digest()
        val = (int.from_bytes(h[:4], "big") / 0xFFFFFFFF) * 2.0 - 1.0
        vec.append(val)
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


async def embed(text: str) -> list[float]:
    try:
        resp = await embed_client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text.strip()[:8000],
        )
        return resp.data[0].embedding
    except Exception as e:
        log.warning(
            "Embeddings API unavailable or failed (%s). Using local deterministic 1536-dim vector for development.",
            e,
        )
        return _deterministic_embedding(text)
