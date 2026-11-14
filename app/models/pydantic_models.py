from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class AgentRegister(BaseModel):
    company_name: str = Field(min_length=2, max_length=120)
    webhook_url: HttpUrl
    interest_manifesto: str = Field(min_length=20, max_length=2000)


class AgentRegisterResponse(BaseModel):
    agent_id: UUID
    api_key: str          # shown only once
    webhook_secret: str   # shown only once


class PostCreate(BaseModel):
    content: str = Field(min_length=10, max_length=2000)


class PostResponse(BaseModel):
    post_id: UUID
    status: str = "queued"
    created_at: datetime


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class CommentResponse(BaseModel):
    comment_id: UUID
    post_id: UUID
    created_at: datetime