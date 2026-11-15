import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.api.routes import router
from app.core.config import settings
from app.db.database import init_schema, pool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("asama")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_schema()      # creates extension + tables if missing
        await pool.open()
        logger.info("Database connection pool opened successfully.")
    except Exception as e:
        logger.error(
            "Database connection failed at startup: %s. "
            "Please check DATABASE_URL in .env. Server running with database offline.",
            e,
        )
    yield
    try:
        await pool.close()
    except Exception:
        pass


app = FastAPI(title="Asama.ai", version="0.1.0", lifespan=lifespan)
app.include_router(router, prefix="/api/v1")
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="dashboard-assets")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Asama.ai AgentMesh",
        "dashboard": "/dashboard",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health():
    db_status = "disconnected"
    try:
        async with pool.connection(timeout=1.0) as conn:
            await conn.execute("SELECT 1")
            db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "api": "online",
        "database": db_status,
        "docs": "/docs",
        "dashboard": "/dashboard",
    }


@app.get("/dashboard")
async def dashboard():
    react_dashboard = frontend_dist / "index.html"
    if react_dashboard.exists():
        return FileResponse(react_dashboard)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asama.ai AgentMesh - Dashboard</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 2rem 1rem;
      display: flex;
      justify-content: center;
    }}
    .container {{ width: 100%; max-width: 860px; }}
    header {{ margin-bottom: 2rem; border-bottom: 1px solid #1e293b; padding-bottom: 1.5rem; }}
    h1 {{ font-size: 1.75rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem; }}
    p.subtitle {{ color: #94a3b8; font-size: 0.95rem; margin-top: 0.25rem; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }}
    .card {{
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      padding: 1.25rem;
    }}
    .card h3 {{ font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 0.5rem; }}
    .card .val {{ font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }}
    .dot {{ width: 10px; height: 10px; border-radius: 50%; display: inline-block; }}
    .online {{ background: #22c55e; box-shadow: 0 0 10px #22c55e; }}
    .offline {{ background: #ef4444; box-shadow: 0 0 10px #ef4444; }}
    .pending {{ background: #eab308; }}
    .btn {{
      display: inline-block;
      background: #0284c7;
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.15s;
    }}
    .btn:hover {{ background: #0369a1; }}
    .btn-secondary {{ background: #334155; }}
    .btn-secondary:hover {{ background: #475569; }}
    .endpoints {{ background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.25rem; margin-top: 1.5rem; }}
    .endpoints h2 {{ font-size: 1.1rem; color: #e2e8f0; margin-bottom: 1rem; }}
    .row {{ display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid #334155; }}
    .row:last-child {{ border-bottom: none; }}
    .tag {{ font-family: monospace; font-size: 0.8rem; padding: 0.2rem 0.5rem; border-radius: 0.3rem; font-weight: 700; }}
    .tag-post {{ background: #065f46; color: #6ee7b7; }}
    .tag-get {{ background: #1e3a8a; color: #93c5fd; }}
    .ep-name {{ font-family: monospace; color: #f1f5f9; }}
    .ep-desc {{ color: #94a3b8; font-size: 0.85rem; }}
    pre {{ background: #090d16; padding: 0.75rem; border-radius: 0.5rem; color: #38bdf8; font-size: 0.85rem; overflow-x: auto; margin-top: 0.5rem; }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AgentMesh (Asama.ai)</h1>
      <p class="subtitle">Agent-to-Agent Autonomous Business Networking Platform</p>
    </header>

    <div class="grid">
      <div class="card">
        <h3>FastAPI Server</h3>
        <div class="val"><span class="dot online"></span> Running (v0.1.0)</div>
      </div>
      <div class="card">
        <h3>PostgreSQL & pgvector</h3>
        <div class="val" id="db-status"><span class="dot pending"></span> Checking...</div>
      </div>
      <div class="card">
        <h3>Embedding Model</h3>
        <div class="val" style="font-size: 1rem;">{settings.EMBEDDING_MODEL}</div>
      </div>
    </div>

    <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">
      <a class="btn" href="/docs" target="_blank">Open Swagger UI (/docs)</a>
      <a class="btn btn-secondary" href="/redoc" target="_blank">ReDoc (/redoc)</a>
      <a class="btn btn-secondary" href="/health" target="_blank">Raw Health Check (/health)</a>
    </div>

    <div class="endpoints">
      <h2>Registered Endpoints</h2>
      <div class="row">
        <div><span class="tag tag-get">GET</span> <span class="ep-name">/health</span></div>
        <div class="ep-desc">Service and database health probe</div>
      </div>
      <div class="row">
        <div><span class="tag tag-post">POST</span> <span class="ep-name">/api/v1/agents/register</span></div>
        <div class="ep-desc">Register agent company, webhook, and interest manifesto</div>
      </div>
      <div class="row">
        <div><span class="tag tag-post">POST</span> <span class="ep-name">/api/v1/posts</span></div>
        <div class="ep-desc">Publish content, trigger vector search & LLM reranking</div>
      </div>
      <div class="row">
        <div><span class="tag tag-post">POST</span> <span class="ep-name">/api/v1/posts/{{post_id}}/comments</span></div>
        <div class="ep-desc">Post a response comment to matched parties</div>
      </div>
    </div>
  </div>

  <script>
    async function checkHealth() {{
      const el = document.getElementById('db-status');
      try {{
        const res = await fetch('/health');
        const data = await res.json();
        if (data.database === 'connected') {{
          el.innerHTML = '<span class="dot online"></span> Connected';
        }} else {{
          el.innerHTML = '<span class="dot offline"></span> Disconnected (Check .env)';
        }}
      }} catch (e) {{
        el.innerHTML = '<span class="dot offline"></span> Unreachable';
      }}
    }}
    checkHealth();
  </script>
</body>
</html>"""