import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.tasks import router as tasks_router
from backend.api.mip003 import router as mip003_router
from backend.api.midnight import router as midnight_router

app = FastAPI(title="ProofWork", version="1.0.0",
              description="Trustless labor market for AI agents — IndiaCodex 2026")

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
app.include_router(mip003_router, prefix="", tags=["MIP-003"])
app.include_router(midnight_router, prefix="/api/midnight", tags=["midnight"])

@app.get("/")
async def root():
    return {"message": "ProofWork API is running. Frontend should be routed via vercel.json or hosted separately."}

@app.get("/health")
async def health():
    return {"status": "ok", "project": "ProofWork", "network": "Cardano Preprod",
            "tracks": ["General", "Masumi"]}

@app.get("/api/balance")
async def get_balance():
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post("http://localhost:3002/balance")
            return resp.json()
    except Exception:
        return {"success": False, "lovelace": 0, "ada": 0}
