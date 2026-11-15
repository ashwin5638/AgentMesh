import json
import logging
from uuid import UUID

from openai import AsyncOpenAI
from pgvector import Vector

from app.core.config import settings
from app.db.database import pool
from app.services.webhook import dispatch_post

log = logging.getLogger(__name__)

_api_key = settings.OPENAI_API_KEY or settings.grok_API
_base_url = settings.LLM_BASE_URL
_rerank_model = settings.RERANK_MODEL

# Auto-adapt if user supplied a Groq API key (starts with gsk_)
if _api_key and _api_key.startswith("gsk_") and "api.x.ai" in _base_url:
    _base_url = "https://api.groq.com/openai/v1"
    _rerank_model = "qwen/qwen3.8-27b"

_client = AsyncOpenAI(
    api_key=_api_key,
    base_url=_base_url,
)

# Stage 1 (SQL guardrails) + Stage 2 (cosine-distance vector search) in one query.
CANDIDATE_SQL = """
SELECT id, company_name, webhook_url, webhook_secret, interest_manifesto,
       interest_embedding <=> %(emb)s AS distance
FROM agents
WHERE is_active = TRUE
  AND interest_embedding IS NOT NULL
  AND id <> %(author)s
  AND NOT (id = ANY(COALESCE((SELECT blocked_agent_ids FROM agents WHERE id = %(author)s), '{}')))
  AND NOT (%(author)s = ANY(blocked_agent_ids))
ORDER BY interest_embedding <=> %(emb)s
LIMIT %(k)s
"""

RERANK_SYSTEM = (
    "You score how relevant a business post is to each company's stated interests. "
    "Score 0.0 to 1.0: 1.0 = clear, actionable partnership/business fit; 0.0 = unrelated. "
    "Be strict: only score above 0.75 if the company would genuinely want to see this. "
    'Respond with JSON only: {"scores": [{"index": <int>, "score": <float>}]}'
)


async def find_candidates(author_id: UUID, embedding: list[float]) -> list[dict]:
    async with pool.connection() as conn:
        cur = await conn.execute(
            CANDIDATE_SQL,
            {"emb": Vector(embedding), "author": author_id, "k": settings.VECTOR_TOP_K},
        )
        return await cur.fetchall()


async def rerank(post_text: str, candidates: list[dict]) -> dict[int, float]:
    """Stage 3: one batched LLM call scoring every candidate. Returns {candidate_index: score}."""
    if not candidates:
        return {}
    listing = "\n".join(f"{i}. {c['interest_manifesto']}" for i, c in enumerate(candidates))
    user_msg = f"POST:\n{post_text}\n\nCOMPANY INTERESTS:\n{listing}"
    try:
        resp = await _client.chat.completions.create(
            model=_rerank_model,
            response_format={"type": "json_object"},
            temperature=0,
            messages=[
                {"role": "system", "content": RERANK_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
        )
        data = json.loads(resp.choices[0].message.content)
        scores = {int(s["index"]): float(s["score"]) for s in data.get("scores", [])}
        if scores:
            return scores
    except Exception as exc:
        log.warning("Rerank LLM call failed (%s); using vector similarity fallback", exc)

    # Robust fallback: use vector cosine similarity (1.0 - distance)
    return {
        i: round(max(0.0, min(1.0, 1.0 - float(c.get("distance", 1.0)))), 3)
        for i, c in enumerate(candidates)
    }


async def _log_decisions(post_id: UUID, candidates: list[dict], scores: dict[int, float]):
    async with pool.connection() as conn:
        for i, c in enumerate(candidates):
            await conn.execute(
                """INSERT INTO routing_logs (post_id, target_agent_id, vector_distance, relevance_score)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (post_id, target_agent_id) DO NOTHING""",
                (post_id, c["id"], c["distance"], scores.get(i, 0.0)),
            )


async def route_and_deliver(post_id: UUID, author_id: UUID, content: str, embedding: list[float]):
    """Full pipeline: SQL -> vector -> rerank -> log -> webhook delivery."""
    try:
        candidates = await find_candidates(author_id, embedding)
        scores = await rerank(content, candidates)
        await _log_decisions(post_id, candidates, scores)

        matches = [
            {**c, "score": scores[i]}
            for i, c in enumerate(candidates)
            if scores.get(i, 0.0) >= settings.RELEVANCE_THRESHOLD
        ]
        log.info("Post %s: %d candidates, %d matches", post_id, len(candidates), len(matches))
        if matches:
            await dispatch_post(post_id, author_id, content, matches)
    except Exception:
        log.exception("Routing failed for post %s", post_id)