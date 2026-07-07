"""
Mock billing database — acts like a real billing system.
Agents can query this to actually look up accounts, transactions, refunds.
"""
import uuid
from datetime import datetime, timedelta

# Seeded mock data
_accounts = {
    "ACC-001": {"name": "Alice Kumar",    "email": "alice@example.com", "plan": "Pro",   "status": "active",    "balance": 0.0,   "joined": "2024-01-15"},
    "ACC-002": {"name": "Ravi Shankar",   "email": "ravi@example.com",  "plan": "Basic", "status": "active",    "balance": 12.50, "joined": "2024-03-22"},
    "ACC-003": {"name": "Priya Nair",     "email": "priya@example.com", "plan": "Pro",   "status": "suspended", "balance": 0.0,   "joined": "2023-11-08"},
    "ACC-004": {"name": "Demo User",      "email": "demo@test.com",     "plan": "Free",  "status": "active",    "balance": 0.0,   "joined": "2025-06-01"},
}

_transactions = [
    {"tx_id": "TXN-1001", "account": "ACC-001", "amount": 29.99, "type": "charge",  "desc": "Pro plan - June",      "date": "2025-06-01", "status": "completed"},
    {"tx_id": "TXN-1002", "account": "ACC-001", "amount": 29.99, "type": "charge",  "desc": "Pro plan - June (dup)", "date": "2025-06-01", "status": "completed"},
    {"tx_id": "TXN-1003", "account": "ACC-002", "amount": 9.99,  "type": "charge",  "desc": "Basic plan - June",    "date": "2025-06-01", "status": "completed"},
    {"tx_id": "TXN-1004", "account": "ACC-003", "amount": 29.99, "type": "charge",  "desc": "Pro plan - May",       "date": "2025-05-01", "status": "completed"},
    {"tx_id": "TXN-1005", "account": "ACC-003", "amount": 29.99, "type": "refund",  "desc": "Refund - cancelled",   "date": "2025-05-15", "status": "completed"},
]

_refunds = {}


def lookup_account(identifier: str) -> dict:
    """Look up by account ID or email."""
    identifier = identifier.strip()
    # direct ID match
    if identifier in _accounts:
        acc = _accounts[identifier].copy()
        acc["account_id"] = identifier
        return {"found": True, "account": acc}
    # email match
    for acc_id, acc in _accounts.items():
        if acc["email"].lower() == identifier.lower():
            result = acc.copy()
            result["account_id"] = acc_id
            return {"found": True, "account": result}
    return {"found": False, "error": f"No account found for '{identifier}'"}


def get_transactions(account_id: str) -> dict:
    txns = [t for t in _transactions if t["account"] == account_id]
    if not txns:
        return {"found": False, "error": f"No transactions for {account_id}"}
    return {"found": True, "account_id": account_id, "transactions": txns, "count": len(txns)}


def find_duplicate_charges(account_id: str) -> dict:
    txns = [t for t in _transactions if t["account"] == account_id and t["type"] == "charge"]
    seen, dupes = {}, []
    for t in txns:
        key = (t["date"], t["amount"])
        if key in seen:
            dupes.append({"original": seen[key], "duplicate": t})
        else:
            seen[key] = t
    return {"account_id": account_id, "duplicates_found": len(dupes), "duplicates": dupes}


def process_refund(account_id: str, tx_id: str, reason: str) -> dict:
    tx = next((t for t in _transactions if t["tx_id"] == tx_id and t["account"] == account_id), None)
    if not tx:
        return {"success": False, "error": f"Transaction {tx_id} not found for account {account_id}"}
    if tx["type"] == "refund":
        return {"success": False, "error": "This transaction is already a refund"}
    refund_id = f"REF-{uuid.uuid4().hex[:6].upper()}"
    refund = {
        "refund_id": refund_id, "original_tx": tx_id, "account": account_id,
        "amount": tx["amount"], "reason": reason,
        "status": "approved", "eta_days": 5,
        "created": datetime.now().strftime("%Y-%m-%d"),
    }
    _refunds[refund_id] = refund
    _transactions.append({
        "tx_id": refund_id, "account": account_id, "amount": tx["amount"],
        "type": "refund", "desc": f"Refund: {reason}", "date": refund["created"], "status": "pending",
    })
    return {"success": True, "refund": refund}


def get_plan_info(plan: str) -> dict:
    plans = {
        "Free":  {"price": 0,     "features": ["5 tasks/month", "FAQ agent only", "No escrow"]},
        "Basic": {"price": 9.99,  "features": ["50 tasks/month", "Technical + FAQ agents", "Escrow up to 10 ADA"]},
        "Pro":   {"price": 29.99, "features": ["Unlimited tasks", "All agents", "Escrow up to 1000 ADA", "Priority queue"]},
    }
    return plans.get(plan, {"error": f"Unknown plan: {plan}"})
