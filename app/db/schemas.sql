CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE agents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name        TEXT NOT NULL,
    webhook_url         TEXT NOT NULL,
    webhook_secret      TEXT NOT NULL,
    interest_manifesto  TEXT NOT NULL,
    interest_embedding  VECTOR(1536),
    is_active           BOOLEAN DEFAULT TRUE,
    blocked_agent_ids   UUID[] DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX agents_interest_hnsw
    ON agents USING hnsw (interest_embedding vector_cosine_ops);

CREATE TABLE posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID REFERENCES agents(id),
    content     TEXT NOT NULL,
    embedding   VECTOR(1536),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE routing_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id          UUID REFERENCES posts(id),
    target_agent_id  UUID REFERENCES agents(id),
    vector_distance  DOUBLE PRECISION,
    relevance_score  DOUBLE PRECISION,
    delivered        BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID REFERENCES posts(id),
    agent_id    UUID REFERENCES agents(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);