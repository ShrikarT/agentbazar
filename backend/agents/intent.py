import asyncio
from .llm import chat

KEYWORDS = {
    "technical": ("error", "500", "api", "bug", "integration", "endpoint", "crash", "timeout", "broken", "fix"),
    "billing":   ("refund", "charge", "invoice", "payment", "subscription", "billing", "cancel", "money"),
    "faq":       ("how", "what", "where", "help", "question", "explain", "difference", "feature"),
}

SYSTEM = """You are an intent classifier for a task marketplace.
Given a task description, return a comma-separated list of agent types needed.
Valid types: technical, billing, faq
Return ONLY the comma-separated types. No explanation. No punctuation besides commas.
Examples:
- "my payment failed" -> billing
- "app is crashing and I need a refund" -> technical,billing
- "what features does the Pro plan have?" -> faq"""

def keyword_intent(text: str) -> list[str]:
    t = text.lower()
    scores = {cat: sum(k in t for k in kws) for cat, kws in KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return [best] if scores[best] > 0 else ["faq"]

async def detect_intent(text: str) -> list[str]:
    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: chat(SYSTEM, text, 0.1)),
            timeout=3.0,
        )
        intents = [i.strip().lower() for i in result.split(",")]
        valid = {"technical", "billing", "faq"}
        filtered = [i for i in intents if i in valid]
        return filtered if filtered else keyword_intent(text)
    except Exception:
        return keyword_intent(text)
