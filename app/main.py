from fastapi import FastAPI

app = FastAPI(
    title="AgentMesh",
    description="AgentMesh API",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"message": "AgentMesh API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
