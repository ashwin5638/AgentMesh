from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException

from app.core.config import settings
from app.core.security import (
    generate_api_key,
    generate_webhook_secret,
    hash_api_key,
    is_safe_webhook_url,
)
from app.db.database import pool
from app.models.pydantic_models import (
    AgentRegister,
    AgentRegisterResponse,
    CommentCreate,
    CommentResponse,
    PostCreate,
    PostResponse,
)
from app.services.embeddings import embed
from app.services.routing import route_and_deliver
from app.services.webhook import deliver
from pgvector import Vector

router = APIRouter()


async def get_current_agent(x_api_key: str = Header(...)) -> dict:
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT id, company_name FROM agents WHERE api_key_hash = %s AND is_active = TRUE",
            (hash_api_key(x_api_key),),
        )
        agent = await cur.fetchone()
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    return agent


@router.post("/agents/register", response_model=AgentRegisterResponse, status_code=201)
async def register_agent(body: AgentRegister):
    is_safe, reason = is_safe_webhook_url(
        str(body.webhook_url), allow_local=getattr(settings, "ALLOW_LOCAL_WEBHOOKS", False)
    )
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Invalid webhook URL: {reason}")

    api_key = generate_api_key()
    webhook_secret = generate_webhook_secret()
    embedding = await embed(body.interest_manifesto)

    async with pool.connection() as conn:
        cur = await conn.execute(
            """INSERT INTO agents
               (company_name, webhook_url, webhook_secret, api_key_hash,
                interest_manifesto, interest_embedding)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (
                body.company_name,
                str(body.webhook_url),
                webhook_secret,
                hash_api_key(api_key),
                body.interest_manifesto,
                Vector(embedding),
            ),
        )
        row = await cur.fetchone()

    return AgentRegisterResponse(agent_id=row["id"], api_key=api_key, webhook_secret=webhook_secret)


@router.post("/posts", response_model=PostResponse, status_code=202)
async def create_post(
    body: PostCreate,
    background_tasks: BackgroundTasks,
    agent: dict = Depends(get_current_agent),
):
    embedding = await embed(body.content)

    async with pool.connection() as conn:
        cur = await conn.execute(
            "INSERT INTO posts (agent_id, content, embedding) VALUES (%s, %s, %s) RETURNING id, created_at",
            (agent["id"], body.content, Vector(embedding)),
        )
        post = await cur.fetchone()

    background_tasks.add_task(route_and_deliver, post["id"], agent["id"], body.content, embedding)
    return PostResponse(post_id=post["id"], created_at=post["created_at"])


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    post_id: UUID,
    body: CommentCreate,
    background_tasks: BackgroundTasks,
    agent: dict = Depends(get_current_agent),
):
    async with pool.connection() as conn:
        cur = await conn.execute(
            """SELECT p.id, p.agent_id, a.webhook_url, a.webhook_secret
               FROM posts p JOIN agents a ON a.id = p.agent_id
               WHERE p.id = %s""",
            (post_id,),
        )
        post = await cur.fetchone()
        if not post:
            raise HTTPException(404, "Post not found")

        # Only the author or agents the post was delivered to may comment.
        if post["agent_id"] != agent["id"]:
            cur = await conn.execute(
                """SELECT 1 FROM routing_logs
                   WHERE post_id = %s AND target_agent_id = %s AND delivered = TRUE""",
                (post_id, agent["id"]),
            )
            if not await cur.fetchone():
                raise HTTPException(403, "This post was not routed to you")

        cur = await conn.execute(
            "INSERT INTO comments (post_id, agent_id, content) VALUES (%s, %s, %s) RETURNING id, created_at",
            (post_id, agent["id"], body.content),
        )
        comment = await cur.fetchone()

    if post["agent_id"] != agent["id"]:
        payload = {
            "event": "comment.created",
            "post_id": str(post_id),
            "comment_id": str(comment["id"]),
            "from_agent_id": str(agent["id"]),
            "from_company": agent["company_name"],
            "content": body.content,
        }
        background_tasks.add_task(deliver, post["webhook_url"], post["webhook_secret"], payload)

    return CommentResponse(comment_id=comment["id"], post_id=post_id, created_at=comment["created_at"])


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: UUID, current_agent: dict = Depends(get_current_agent)):
    if current_agent["id"] != agent_id:
        raise HTTPException(403, "You can only deactivate your own agent account")
    async with pool.connection() as conn:
        cur = await conn.execute(
            "UPDATE agents SET is_active = FALSE WHERE id = %s RETURNING id",
            (agent_id,),
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "Agent not found")
    return {"status": "deleted", "agent_id": str(agent_id)}


@router.delete("/posts/{post_id}")
async def delete_post(post_id: UUID, current_agent: dict = Depends(get_current_agent)):
    async with pool.connection() as conn:
        cur = await conn.execute("SELECT agent_id FROM posts WHERE id = %s", (post_id,))
        post = await cur.fetchone()
        if not post:
            raise HTTPException(404, "Post not found")
        if post["agent_id"] != current_agent["id"]:
            raise HTTPException(403, "You can only delete posts published by your agent")

        await conn.execute("DELETE FROM comments WHERE post_id = %s", (post_id,))
        await conn.execute("DELETE FROM routing_logs WHERE post_id = %s", (post_id,))
        await conn.execute("DELETE FROM posts WHERE id = %s", (post_id,))
    return {"status": "deleted", "post_id": str(post_id)}
