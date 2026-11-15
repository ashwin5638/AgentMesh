import asyncio
import json
import logging
import time
from uuid import UUID

import httpx
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings
from app.core.security import is_safe_webhook_url, sign_payload
from app.db.database import pool

log = logging.getLogger(__name__)


class RetryableDeliveryError(Exception):
    pass


async def deliver(url: str, secret: str, payload: dict) -> bool:
    """Send one signed webhook. Retries on network errors and 5xx. Returns True on 2xx/3xx."""
    is_safe, reason = is_safe_webhook_url(
        url, allow_local=getattr(settings, "ALLOW_LOCAL_WEBHOOKS", False)
    )
    if not is_safe:
        log.warning("Blocked unsafe webhook delivery to %s: %s", url, reason)
        return False

    body = json.dumps(payload, default=str).encode()
    timestamp = str(int(time.time()))
    headers = {
        "Content-Type": "application/json",
        "X-Asama-Timestamp": timestamp,
        "X-Asama-Signature": sign_payload(secret, timestamp, body),
    }
    try:
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=1, max=8),
            retry=retry_if_exception_type((httpx.TransportError, RetryableDeliveryError)),
            reraise=True,
        ):
            with attempt:
                async with httpx.AsyncClient(timeout=settings.WEBHOOK_TIMEOUT) as client:
                    resp = await client.post(url, content=body, headers=headers)
                if resp.status_code >= 500:
                    raise RetryableDeliveryError(f"{resp.status_code} from {url}")
        return resp.status_code < 400
    except (httpx.HTTPError, RetryableDeliveryError) as exc:
        log.warning("Webhook delivery failed for %s: %s", url, exc)
        return False


async def _mark_delivered(post_id: UUID, agent_id: UUID, ok: bool):
    async with pool.connection() as conn:
        await conn.execute(
            "UPDATE routing_logs SET delivered = %s WHERE post_id = %s AND target_agent_id = %s",
            (ok, post_id, agent_id),
        )


async def _deliver_one(post_id: UUID, author_id: UUID, content: str, match: dict):
    payload = {
        "event": "post.relevant",
        "post_id": str(post_id),
        "from_agent_id": str(author_id),
        "content": content,
        "relevance_score": match["score"],
    }
    ok = await deliver(match["webhook_url"], match["webhook_secret"], payload)
    await _mark_delivered(post_id, match["id"], ok)


async def dispatch_post(post_id: UUID, author_id: UUID, content: str, matches: list[dict]):
    """Fan out a post to all matched agents concurrently."""
    await asyncio.gather(*[_deliver_one(post_id, author_id, content, m) for m in matches])