from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.tasks import router as tasks_router
from backend.api.mip003 import router as mip003_router

app = FastAPI(title="AgentBazaar", version="1.0.0",
              description="Cardano AI Agent Marketplace — IndiaCodex 2026")

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
app.include_router(mip003_router, prefix="", tags=["MIP-003"])

@app.get("/health")
async def health():
    return {"status": "ok", "project": "AgentBazaar", "network": "Cardano Preprod",
            "tracks": ["General", "Masumi"]}
