"""MIP-003 endpoints — the Masumi-facing surface of our agent."""
from fastapi import APIRouter
from backend.masumi.client import masumi
from backend.api.tasks import _tasks, execute_task

router = APIRouter()

@router.get("/availability")
async def availability():
    return {"status": "available", "agents": ["technical", "billing", "faq"]}

@router.get("/input_schema")
async def input_schema():
    return {
        "type": "object",
        "properties": {
            "task_id": {"type": "string"},
            "description": {"type": "string"},
            "agent_type": {"type": "string", "enum": ["technical", "billing", "faq"]},
        },
        "required": ["task_id", "description"],
    }

@router.post("/start_job")
async def start_job(body: dict):
    task_id = body.get("identifier_from_purchaser", "")
    input_data = body.get("input_data", {})
    job = await masumi.start_job(task_id, input_data)
    return job

@router.get("/status")
async def job_status(job_id: str):
    return await masumi.job_status(job_id)
