import re
from .llm import chat
from backend.tools.search import web_search
from backend.tools.billing_db import (
    lookup_account, get_transactions, find_duplicate_charges,
    process_refund, get_plan_info,
)
from backend.tools.code_executor import execute_code, analyze_data


# ── Technical Agent ──────────────────────────────────────────────────────────

def _technical_agent(task: str) -> str:
    # Check if task contains code to execute
    has_code = "```" in task or "run this" in task.lower() or "execute" in task.lower()

    if has_code:
        exec_result = execute_code(task)
        context = f"""
Code execution result:
- Success: {exec_result['success']}
- Output: {exec_result['output'] or '(no output)'}
- Error: {exec_result['error'] or 'none'}
- Code run: {exec_result['code']}
"""
    else:
        # Web search for technical docs/solutions
        search = web_search(f"how to fix: {task[:200]}", max_results=3)
        context = f"""
Web search results for this technical issue:
Answer: {search['answer']}

Sources:
""" + "\n".join(f"- {r['title']}: {r['snippet']}" for r in search['results'])

    system = """You are TechSolver, a technical AI agent on the Cardano Masumi network.
You have access to real web search results and can execute code.
Use the context provided to give a precise, actionable answer.
If code was executed, explain the output clearly."""

    return chat(system, f"Task: {task}\n\nContext from tools:\n{context}")


# ── Billing Agent ────────────────────────────────────────────────────────────

def _billing_agent(task: str) -> str:
    task_lower = task.lower()
    context_parts = []

    # Extract account identifier (email or ACC-xxx)
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[a-z]+', task)
    acc_match = re.search(r'ACC-\d+', task, re.IGNORECASE)
    identifier = email_match.group(0) if email_match else (acc_match.group(0) if acc_match else None)

    if identifier:
        acc_result = lookup_account(identifier)
        if acc_result["found"]:
            acc = acc_result["account"]
            context_parts.append(f"Account found: {acc['name']} | Plan: {acc['plan']} | Status: {acc['status']} | Balance: ${acc['balance']}")
            txns = get_transactions(acc["account_id"])
            if txns["found"]:
                context_parts.append(f"Transactions ({txns['count']}):")
                for t in txns["transactions"]:
                    context_parts.append(f"  {t['tx_id']}: ${t['amount']} {t['type']} - {t['desc']} ({t['date']}) [{t['status']}]")
            if "duplicate" in task_lower or "charged twice" in task_lower or "double" in task_lower:
                dupes = find_duplicate_charges(acc["account_id"])
                if dupes["duplicates_found"] > 0:
                    context_parts.append(f"\nDUPLICATE CHARGES FOUND: {dupes['duplicates_found']}")
                    for d in dupes["duplicates"]:
                        context_parts.append(f"  Original: {d['original']['tx_id']} | Duplicate: {d['duplicate']['tx_id']} | Amount: ${d['duplicate']['amount']}")
                    dup = dupes["duplicates"][0]
                    refund = process_refund(acc["account_id"], dup["duplicate"]["tx_id"], "Duplicate charge")
                    if refund["success"]:
                        context_parts.append(f"\nREFUND PROCESSED: {refund['refund']['refund_id']} | ${refund['refund']['amount']} | ETA: {refund['refund']['eta_days']} days")
        else:
            context_parts.append(f"Account lookup: {acc_result['error']}")
    else:
        context_parts.append("No account identifier found in task. Responding with general billing info.")

    if "plan" in task_lower or "upgrade" in task_lower or "pricing" in task_lower:
        for plan in ["Free", "Basic", "Pro"]:
            info = get_plan_info(plan)
            context_parts.append(f"{plan} (${info['price']}/mo): {', '.join(info['features'])}")

    context = "\n".join(context_parts) if context_parts else "No billing data retrieved."

    system = """You are BillingBot, a billing AI agent on the Cardano Masumi network.
You have queried the REAL billing database. Use the actual data below to give a precise answer.
If a refund was processed, confirm the refund ID and ETA. Be direct and factual."""

    return chat(system, f"Task: {task}\n\nBilling database results:\n{context}")


# ── FAQ / Research Agent ─────────────────────────────────────────────────────

def _faq_agent(task: str) -> str:
    search = web_search(task, max_results=5)
    context = f"Web search answer: {search['answer']}\n\nSources:\n"
    context += "\n".join(f"- [{r['title']}]({r['url']})\n  {r['snippet']}" for r in search['results'])

    system = """You are FAQ Oracle, a research AI agent on the Cardano Masumi network.
You have real web search results. Synthesize them into a clear, sourced answer.
Always cite your sources with URLs."""

    return chat(system, f"Question: {task}\n\nSearch results:\n{context}")


# ── Data Analysis Agent ──────────────────────────────────────────────────────

def _data_agent(task: str) -> str:
    # Check if CSV data is embedded in the task
    csv_match = re.search(r'((?:\w+,)+\w+\n(?:.*\n?)+)', task)
    if csv_match:
        csv_text = csv_match.group(1)
        question = task.replace(csv_text, "").strip()
        result = analyze_data(csv_text, question)
        context = result["analysis"] if result["success"] else f"Analysis error: {result['error']}"
    else:
        # Search for relevant data analysis approaches
        search = web_search(f"data analysis: {task[:200]}", max_results=3)
        context = f"No CSV data found in task. Web search context:\n{search['answer']}"

    system = """You are DataBot, a data analysis AI agent on the Cardano Masumi network.
You can run real pandas analysis on CSV data. Use the analysis results below to answer clearly.
Include key statistics and insights."""

    return chat(system, f"Task: {task}\n\nAnalysis results:\n{context}")


# ── Router ───────────────────────────────────────────────────────────────────

AGENTS = {
    "technical": {"id": "masumi-agent-tech-001", "fn": _technical_agent},
    "billing":   {"id": "masumi-agent-bill-001", "fn": _billing_agent},
    "faq":       {"id": "masumi-agent-faq-001",  "fn": _faq_agent},
    "data":      {"id": "masumi-agent-data-001", "fn": _data_agent},
}


def run_agent(agent_type: str, task: str) -> dict:
    agent = AGENTS.get(agent_type, AGENTS["faq"])
    result = agent["fn"](task)
    return {"agent_id": agent["id"], "agent_type": agent_type, "result": result}


def run_agents(agent_types: list[str], task: str) -> list[dict]:
    return [run_agent(t, task) for t in agent_types]
