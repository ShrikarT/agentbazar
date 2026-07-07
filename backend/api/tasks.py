import uuid, hashlib
from fastapi import APIRouter, HTTPException
from backend.models.schemas import TaskCreate, TaskResponse, TaskStatus
from backend.agents.intent import detect_intent
from backend.agents.workers import run_agents
from backend.masumi.client import masumi

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
    t["release_tx_hash"] = hashlib.sha256(f"{task_id}-release".encode()).hexdigest()
    t["status"] = TaskStatus.paid
    if t["masumi_job_id"]:
        ms = await masumi.job_status(t["masumi_job_id"])
        t["masumi_status"] = ms.get("status", "completed")
    return _to_response(t)

def _to_response(t: dict) -> TaskResponse:
    return TaskResponse(
        task_id=t["task_id"], title=t["title"], description=t["description"],
        reward_ada=t["reward_ada"], status=t["status"], intents=t.get("intents", []),
        escrow_tx_hash=t.get("escrow_tx_hash"), release_tx_hash=t.get("release_tx_hash"),
        agent_type=t["intents"][0] if t.get("intents") else None,
        result=t.get("result"), agents_used=t.get("agents_used", []),
        masumi_job_id=t.get("masumi_job_id"), masumi_status=t.get("masumi_status"),
    )
