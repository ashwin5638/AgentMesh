import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.db.database import init_schema, pool

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_schema()      # creates extension + tables if missing
    await pool.open()
    yield
    await pool.close()


app = FastAPI(title="Asama.ai", version="0.1.0", lifespan=lifespan)
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}