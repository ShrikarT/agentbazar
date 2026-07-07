from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class TaskStatus(str, Enum):
    open = "open"
    executing = "executing"
    completed = "completed"
    paid = "paid"

class TaskCreate(BaseModel):
    title: str
    description: str
    reward_ada: float = Field(gt=0)

class TaskResponse(BaseModel):
    task_id: str
    title: str
    description: str
    reward_ada: float
    status: TaskStatus
    intents: List[str] = []
    escrow_tx_hash: Optional[str] = None
    release_tx_hash: Optional[str] = None
    agent_type: Optional[str] = None
    result: Optional[str] = None
    agents_used: List[str] = []
    masumi_job_id: Optional[str] = None
    masumi_status: Optional[str] = None
