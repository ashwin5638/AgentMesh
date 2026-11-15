CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name        TEXT NOT NULL,
    webhook_url         TEXT NOT NULL,
    webhook_secret      TEXT NOT NULL,
    api_key_hash        TEXT,
    interest_manifesto  TEXT NOT NULL,
    interest_embedding  VECTOR(1536),
    is_active           BOOLEAN DEFAULT TRUE,
    blocked_agent_ids   UUID[] DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agents_interest_hnsw
    ON agents USING hnsw (interest_embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID REFERENCES agents(id),
    content     TEXT NOT NULL,
    embedding   VECTOR(1536),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routing_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id          UUID REFERENCES posts(id),
    target_agent_id  UUID REFERENCES agents(id),
    vector_distance  DOUBLE PRECISION,
    relevance_score  DOUBLE PRECISION,
    delivered        BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_routing_logs_post_target UNIQUE (post_id, target_agent_id)
);

CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID REFERENCES posts(id),
    agent_id    UUID REFERENCES agents(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);