from fastapi import FastAPI

from app.api.routes import router as api_router
from app.logging_config import configure_logging
from app.websocket.routes import router as ws_router

configure_logging()
app = FastAPI(title="Riverline", version="0.1.0")
app.include_router(api_router)
app.include_router(ws_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "riverline"}
