import os, httpx
from .provider import PaymentProvider
from .mock import MockMasumiProvider, AGENT_REGISTRY

BASE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://localhost:3001/api/v1")
API_KEY  = os.getenv("PAYMENT_API_KEY", "")

class RealMasumiProvider(PaymentProvider):
    def __init__(self):
        self._fallback = MockMasumiProvider()
        self._headers = {"token": API_KEY, "Content-Type": "application/json"}

    async def start_job(self, task_id: str, input_data: dict) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.post(f"{BASE_URL}/payment/",
                    headers=self._headers,
                    json={"identifier_from_purchaser": task_id.encode().hex(),
                          "input_data": input_data,
                          "network": os.getenv("NETWORK", "Preprod"),
                          "agentIdentifier": os.getenv("AGENT_IDENTIFIER", ""),
                          "amounts": [{"amount": os.getenv("PAYMENT_AMOUNT", "10000000"),
                                       "unit": os.getenv("PAYMENT_UNIT", "lovelace")}]})
                r.raise_for_status()
                return r.json()
        except Exception:
            return await self._fallback.start_job(task_id, input_data)

    async def job_status(self, job_id: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(f"{BASE_URL}/payment/{job_id}", headers=self._headers)
                r.raise_for_status()
                return r.json()
        except Exception:
            return await self._fallback.job_status(job_id)

    def get_agent_info(self, agent_type: str) -> dict:
        return AGENT_REGISTRY.get(agent_type, self._fallback.get_agent_info(agent_type))
