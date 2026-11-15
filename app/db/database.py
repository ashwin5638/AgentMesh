from pgvector.psycopg import register_vector_async
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.core.config import settings


async def _configure(conn):
    await register_vector_async(conn)


# open=False: the pool is opened in main.py's lifespan.
# prepare_threshold=None avoids errors with Supabase's pgbouncer pooler.
pool = AsyncConnectionPool(
    settings.DATABASE_URL,
    min_size=1,
    max_size=10,
    open=False,
    configure=_configure,
    kwargs={"row_factory": dict_row, "prepare_threshold": None, "connect_timeout": 5},
)


async def init_schema():
    """Run schemas.sql once at startup (the extension must exist before the pool registers vectors)."""
    import pathlib
    import psycopg

    sql = (pathlib.Path(__file__).parent / "schemas.sql").read_text()
    async with await psycopg.AsyncConnection.connect(
        settings.DATABASE_URL, autocommit=True, connect_timeout=5
    ) as conn:
        await conn.execute(sql)