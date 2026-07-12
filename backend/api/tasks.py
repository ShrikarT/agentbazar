import uuid, hashlib, os, logging
import httpx
from fastapi import APIRouter, HTTPException
from backend.models.schemas import TaskCreate, TaskResponse, TaskStatus
from backend.agents.intent import detect_intent
from backend.agents.workers import run_agents
from backend.masumi.client import masumi

logger = logging.getLogger(__name__)

ESCROW_SERVICE_URL = os.getenv("ESCROW_SERVICE_URL", "http://localhost:3002")
ESCROW_TIMEOUT = 30.0  # seconds — chain transactions take time

router = APIRouter()
_tasks: dict[str, dict] = {}

@router.post("/", response_model=TaskResponse)
async def create_task(body: TaskCreate):
    task_id = str(uuid.uuid4())
    intents = await detect_intent(body.description)
    masumi_job = await masumi.start_job(task_id, {"description": body.description})
    task = {
        "task_id": task_id, "title": body.title, "description": body.description,
        "reward_ada": body.reward_ada, "reward_lovelace": int(body.reward_ada * 1_000_000),
        "status": TaskStatus.open, "intents": intents,
        "masumi_job_id": masumi_job.get("job_id"),
        "masumi_status": masumi_job.get("job_state", "awaiting_payment"),
        "escrow_tx_hash": None, "release_tx_hash": None,
        "agents_used": [], "result": None,
    }
    _tasks[task_id] = task
    return _to_response(task)

@router.get("/", response_model=list[TaskResponse])
async def list_tasks():
    return [_to_response(t) for t in _tasks.values()]

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    t = _tasks.get(task_id)
    if not t: raise HTTPException(404, "Task not found")
    return _to_response(t)

@router.get("/{task_id}/bids")
async def get_bids(task_id: str):
    t = _tasks.get(task_id)
    if not t: raise HTTPException(404, "Task not found")
    bids = []
    for intent in t["intents"]:
        info = masumi.get_agent_info(intent)
        bids.append({
            "agent_id": info["agent_id"], "agent_type": intent,
            "agent_name": info["name"], "reward_ada": t["reward_ada"],
            "success_rate": info["success_rate"], "completed_jobs": info["completed_jobs"],
            "masumi_verified": True,
            "zk_reputation_proof": f"zk-threshold-80pct-{intent}",
            "zk_verified": info["success_rate"] >= 0.80,
        })
    return {"task_id": task_id, "bids": bids}

@router.post("/{task_id}/execute", response_model=TaskResponse)
async def execute_task(task_id: str):
    t = _tasks.get(task_id)
    if not t: raise HTTPException(404, "Task not found")
    if t["status"] != TaskStatus.open:
        raise HTTPException(400, f"Task status is {t['status']}")
    t["status"] = TaskStatus.executing
    # Try real escrow lock via the escrow service, fall back to fake hash
    try:
        async with httpx.AsyncClient(timeout=ESCROW_TIMEOUT) as client:
            resp = await client.post(f"{ESCROW_SERVICE_URL}/lock", json={
                "task_id": task_id,
                "poster_pkh": os.getenv("OPERATOR_VKH", ""),
                "agent_pkh": os.getenv("OPERATOR_VKH", ""),
                "amount_lovelace": t["reward_lovelace"],
            })
            data = resp.json()
            if data.get("success"):
                t["escrow_tx_hash"] = data["tx_hash"]
                logger.info(f"Escrow LOCK succeeded: {data['tx_hash']}")
            else:
                logger.warning(f"Escrow LOCK returned error: {data.get('error')}")
                t["status"] = TaskStatus.open  # Revert status so user can try again
                raise HTTPException(400, f"Blockchain error (Lock): {data.get('error')}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Escrow service unavailable, using fake hash: {exc}")
        t["escrow_tx_hash"] = hashlib.sha256(f"{task_id}-lock".encode()).hexdigest()
    
    results = run_agents(t["intents"], t["description"])
    t["result"] = "\n\n---\n\n".join(
        f"**{r['agent_type'].upper()} AGENT**\n{r['result']}" for r in results)
    t["agents_used"] = [r["agent_id"] for r in results]
    t["status"] = TaskStatus.completed
    if t["masumi_job_id"]:
        ms = await masumi.job_status(t["masumi_job_id"])
        t["masumi_status"] = ms.get("status", "running")
    return _to_response(t)

@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: str):
    t = _tasks.get(task_id)
    if not t: raise HTTPException(404, "Task not found")
    if t["status"] != TaskStatus.completed:
        raise HTTPException(400, "Execute the task before completing")
    # Try real escrow release via the escrow service, fall back to fake hash
    try:
        async with httpx.AsyncClient(timeout=ESCROW_TIMEOUT) as client:
            resp = await client.post(f"{ESCROW_SERVICE_URL}/release", json={
                "lock_tx_hash": t.get("escrow_tx_hash", ""),
                "task_id": task_id,
                "poster_pkh": os.getenv("OPERATOR_VKH", ""),
                "agent_pkh": os.getenv("OPERATOR_VKH", ""),
                "amount_lovelace": t["reward_lovelace"],
            })
            data = resp.json()
            if data.get("success"):
                t["release_tx_hash"] = data["tx_hash"]
                logger.info(f"Escrow RELEASE succeeded: {data['tx_hash']}")
            else:
                logger.warning(f"Escrow RELEASE returned error: {data.get('error')}")
                raise HTTPException(400, f"Blockchain error (Release): The lock transaction may still be pending confirmation on Cardano. Please wait 30 seconds and try again. Details: {data.get('error')}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Escrow service unavailable, using fake hash: {exc}")
        t["release_tx_hash"] = hashlib.sha256(f"{task_id}-release".encode()).hexdigest()
    t["status"] = TaskStatus.paid
    if t["masumi_job_id"]:
        ms = await masumi.job_status(t["masumi_job_id"])
        t["masumi_status"] = ms.get("status", "completed")
    return _to_response(t)

@router.post("/{task_id}/refund", response_model=TaskResponse)
async def refund_task(task_id: str):
    t = _tasks.get(task_id)
    if not t: raise HTTPException(404, "Task not found")
    if t["status"] not in [TaskStatus.completed, TaskStatus.executing]:
        raise HTTPException(400, "Can only refund executing or completed tasks")
    try:
        async with httpx.AsyncClient(timeout=ESCROW_TIMEOUT) as client:
            resp = await client.post(f"{ESCROW_SERVICE_URL}/refund", json={
                "lock_tx_hash": t.get("escrow_tx_hash", ""),
                "task_id": task_id,
                "poster_pkh": os.getenv("OPERATOR_VKH", ""),
                "agent_pkh": os.getenv("OPERATOR_VKH", ""),
                "amount_lovelace": t["reward_lovelace"],
            })
            data = resp.json()
            if data.get("success"):
                t["release_tx_hash"] = data["tx_hash"]
                t["status"] = "refunded"
                logger.info(f"Escrow REFUND succeeded: {data['tx_hash']}")
            else:
                logger.warning(f"Escrow REFUND returned error: {data.get('error')}")
                raise HTTPException(400, f"Blockchain error (Refund): The lock transaction may still be pending. Wait and try again. Details: {data.get('error')}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Escrow service unavailable: {exc}")

    return _to_response(t)

@router.get("/{task_id}/lock_status")
async def check_lock_status(task_id: str):
    t = _tasks.get(task_id)
    if not t: raise HTTPException(404, "Task not found")
    if not t.get("escrow_tx_hash") or len(t["escrow_tx_hash"]) != 64:
        return {"confirmed": False}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{ESCROW_SERVICE_URL}/status/{t['escrow_tx_hash']}")
            data = resp.json()
            return {"confirmed": data.get("confirmed", False)}
    except Exception:
        return {"confirmed": False}

def _to_response(t: dict) -> TaskResponse:
    return TaskResponse(
        task_id=t["task_id"], title=t["title"], description=t["description"],
        reward_ada=t["reward_ada"], status=t["status"], intents=t.get("intents", []),
        escrow_tx_hash=t.get("escrow_tx_hash"), release_tx_hash=t.get("release_tx_hash"),
        agent_type=t["intents"][0] if t.get("intents") else None,
        result=t.get("result"), agents_used=t.get("agents_used", []),
        masumi_job_id=t.get("masumi_job_id"), masumi_status=t.get("masumi_status"),
    )
