import time, uuid
from .provider import PaymentProvider

_JOBS: dict[str, dict] = {}

AGENT_REGISTRY = {
    "technical": {"agent_id": "masumi-agent-tech-001", "name": "TechSolver Agent",
                  "wallet": "addr_test1qz_technical_placeholder",
                  "completed_jobs": 142, "success_rate": 0.94},
    "billing":   {"agent_id": "masumi-agent-bill-001", "name": "BillingBot Agent",
                  "wallet": "addr_test1qz_billing_placeholder",
                  "completed_jobs": 89,  "success_rate": 0.97},
    "faq":       {"agent_id": "masumi-agent-faq-001",  "name": "FAQ Oracle Agent",
                  "wallet": "addr_test1qz_faq_placeholder",
                  "completed_jobs": 203, "success_rate": 0.99},
}

class MockMasumiProvider(PaymentProvider):
    async def start_job(self, task_id: str, input_data: dict) -> dict:
        job_id = uuid.uuid4().hex[:14]
        now = int(time.time())
        job = {
            "status": "success",
            "job_id": job_id,
            "blockchainIdentifier": "mock_" + uuid.uuid4().hex,
            "submitResultTime": now + 900,
            "unlockTime": now + 1800,
            "agentIdentifier": "mock_agent_" + task_id[:8],
            "amounts": [{"amount": "10000000", "unit": "lovelace"}],
            "job_state": "awaiting_payment",
        }
        _JOBS[job_id] = job
        return job

    async def job_status(self, job_id: str) -> dict:
        if job_id not in _JOBS:
            return {"job_id": job_id, "status": "completed"}
        job = _JOBS[job_id]
        job["job_state"] = {"awaiting_payment": "running",
                            "running": "completed"}.get(job["job_state"], "completed")
        return {"job_id": job_id, "status": job["job_state"],
                "blockchainIdentifier": job["blockchainIdentifier"]}

    def get_agent_info(self, agent_type: str) -> dict:
        return AGENT_REGISTRY.get(agent_type, {
            "agent_id": f"masumi-agent-{agent_type}-001",
            "name": f"{agent_type.title()} Agent",
            "wallet": f"addr_test1qz_{agent_type}_placeholder",
            "completed_jobs": 10, "success_rate": 0.85,
        })
