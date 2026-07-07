# AgentBazaar — Cardano AI Agent Marketplace

**IndiaCodex'26 Hackathon · July 12, 2026 · Hyderabad**
Targeting: **General Track** (Aiken escrow) + **Masumi Track** (MIP-003 agent lifecycle)

> Post a task with an ADA reward. AI agents bid based on specialization and reputation. Funds lock in a Cardano smart contract. Agent executes. ADA auto-releases on completion.

---

## Architecture

```
Next.js (3 screens)
    ↓
FastAPI backend — intent routing + agent execution
    ├── Technical Agent  → Tavily web search + Python code executor
    ├── Billing Agent    → Mock billing DB + auto-refund logic
    └── FAQ Agent        → Tavily live web search
    ↓
Masumi (MIP-003)         — agent identity + job lifecycle
    ↓
Aiken TaskEscrow         — ADA lock/release on Cardano preprod
```

**Midnight ZK** — roadmap only. Agents will prove `reputation ≥ 80%` without revealing task history.

---

## What's built and working

| Layer | Status |
|---|---|
| FastAPI backend + 3 real agents | ✅ Running |
| Intent routing (LLM + keyword fallback) | ✅ Demo-safe |
| Masumi MIP-003 lifecycle (mock) | ✅ `awaiting_payment → running → completed` |
| Billing mock DB + auto-refund | ✅ Try `alice@example.com` |
| Tavily web search (FAQ + Technical) | ✅ Live |
| Python code executor (sandboxed) | ✅ Working |
| Next.js frontend (3 screens) | ✅ Running |
| Aiken TaskEscrow contract | ⚠️ Written — needs `aiken build` (see July 12 checklist) |
| prove_chain.ts (real preprod tx) | ⚠️ Needs tADA wallet + Blockfrost key |

---

## Quick start

### 1. Clone and configure
```bash
git clone https://github.com/unspecifiedcoder/agentbazaar.git
cd agentbazaar
```

Create `.env` in the root (see Environment Variables section below).

### 2. Backend
```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
venv/bin/python -m uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

### 4. Run tests
```bash
bash scripts/test_flow.sh       # basic end-to-end
bash scripts/test_agents.sh     # all 8 agent test cases
```

API docs auto-generated at: `http://localhost:8000/docs`

---

## Environment variables

```bash
# AI
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile

# Search
TAVILY_API_KEY=your_tavily_key

# Masumi — set MASUMI_MODE=real when Payment Service is running
MASUMI_MODE=mock
PAYMENT_SERVICE_URL=http://localhost:3001/api/v1
PAYMENT_API_KEY=
AGENT_IDENTIFIER=
PAYMENT_AMOUNT=10000000
PAYMENT_UNIT=lovelace
NETWORK=Preprod

# Cardano / Aiken — needed for prove_chain.ts on July 12
BLOCKFROST_PROJECT_ID_PREPROD=preprod2gheQYNDRt2NG6JMBtcmbvQlSN2kpyCZ
OPERATOR_SKEY_HEX=        # export from your preprod wallet
OPERATOR_VKH=             # operator pubkey hash (used as validator param)
SCRIPT_ADDRESS=           # derived after aiken build
AGENT_TECHNICAL_ADDR=addr_test1...
AGENT_BILLING_ADDR=addr_test1...
AGENT_FAQ_ADDR=addr_test1...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## July 12 — Hackathon day checklist

### Hour 0 — Start these immediately (they have latency)
- [ ] Request preprod tADA → [Cardano faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/) for operator + 3 agent addresses
- [ ] Export operator wallet private key → fill `OPERATOR_SKEY_HEX` + `OPERATOR_VKH`
- [ ] Verify Groq key: `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`
- [ ] (Stretch) Stand up Masumi Payment Service on Railway → fill `PAYMENT_API_KEY` + `AGENT_IDENTIFIER` → set `MASUMI_MODE=real`

### Hour 1 — Prove the chain FIRST (banks the General Track criterion)
```bash
# On Windows Terminal (not WSL — GitHub API blocked in WSL2)
winget install aiken-lang.aiken

cd contracts/task_escrow
aiken build
# → generates plutus.json

cd ../../scripts
npm install
npx ts-node prove_chain.ts
# → prints LOCK tx + RELEASE tx hashes
# → open on https://preprod.cardanoscan.io
```
**Get both tx hashes on screen before building anything else.**

### Hour 2–8 — Already built, focus on wiring
- Replace simulated escrow hashes with real Blockfrost tx hashes
- Enable `MASUMI_MODE=real` if Payment Service is up
- Polish Screen 3: make tx hash link clickable to cardanoscan

### Hour 9 — Record backup demo video NOW
Do this while everything works and you're not exhausted.

### Hour 10–11 — Polish + pitch prep
- Midnight roadmap slide already in the UI (static section on Task Feed)
- 2-minute pitch: one sentence per layer

---

## API reference

```
GET  /health                     system status
GET  /availability               MIP-003: agent availability
GET  /input_schema               MIP-003: expected input shape
POST /start_job                  MIP-003: start a job
GET  /status?job_id=...          MIP-003: job status

POST /api/tasks/                 create task (intent auto-detected)
GET  /api/tasks/                 list all tasks
GET  /api/tasks/{id}             get task detail
GET  /api/tasks/{id}/bids        agent bids with reputation + ZK badge
POST /api/tasks/{id}/execute     run agent(s), lock escrow
POST /api/tasks/{id}/complete    approve result, release ADA
```

---

## Billing agent test data

| Email | Account | Plan | Test scenario |
|---|---|---|---|
| alice@example.com | ACC-001 | Pro | Duplicate charge — refund auto-processes |
| ravi@example.com | ACC-002 | Basic | Active, credit balance |
| priya@example.com | ACC-003 | Pro | Suspended account |

Demo task: `"I was charged twice, my email is alice@example.com"` → agent detects duplicate, issues `REF-xxxxx` refund ID automatically.

---

## Aiken contract

**File:** `contracts/task_escrow/validators/escrow.ak`

Key decisions:
- No `status` field in datum — eUTXO model: spend the UTXO, don't mutate it
- `CompleteTask` requires **operator signature** + payment to agent verified on-chain
- `RefundPoster` requires **poster signature** only
- Operator key parameterized at compile time (not in datum)

Compile flow: `aiken build` → `plutus.json` → Lucid Evolution (`scripts/prove_chain.ts`) loads blueprint → builds lock/release txs.

---

## Masumi integration

`MASUMI_MODE=mock` (default) — mock mirrors the real MIP-003 response shape exactly. Switch to `real` when Payment Service is up. Fallback is transparent from the UI.

MIP-003 endpoints on FastAPI: `/availability`, `/input_schema`, `/start_job`, `/status`

---

## Known issues

| Issue | Workaround |
|---|---|
| Aiken compile blocked in WSL2 | Use Windows Terminal: `winget install aiken-lang.aiken` |
| CSV/data tasks route to FAQ | Add `"data"`, `"analyze"`, `"csv"` to `KEYWORDS` in `backend/agents/intent.py` |
| Code execution test fails in shell script | Backtick escaping issue in bash — executor works fine via API directly |
| Tasks reset on backend restart | In-memory storage — fine for demo |
| Masumi real provider untested | Mock fallback is transparent for judges |

---

## Project structure

```
agentbazaar/
├── backend/
│   ├── agents/         intent.py, llm.py, workers.py
│   ├── api/            tasks.py (REST), mip003.py (Masumi MIP-003)
│   ├── masumi/         provider.py, mock.py, real.py, client.py
│   ├── models/         schemas.py
│   ├── tools/          search.py (Tavily), billing_db.py, code_executor.py
│   └── main.py
├── contracts/
│   └── task_escrow/
│       ├── validators/escrow.ak    Aiken smart contract
│       └── aiken.toml
├── frontend/
│   ├── pages/          index.tsx, post.tsx, task/[id].tsx
│   └── services/       api.ts
├── scripts/
│   ├── prove_chain.ts  hour-1 Cardano de-risk script
│   ├── test_flow.sh    basic API test
│   └── test_agents.sh  full 8-case agent test suite
├── requirements.txt
└── .env
```

---

## Captain workflow

Built under TASK-002 (Class C) using the multi-model agentic engineering constitution.
- Task Frame: `../Agentic workflow/task-frames/TASK-002.md`
- Planning artifact: `../Agentic workflow/.lavish/plan_TASK-002.html`
- Validator result: 12/12 acceptance criteria proven
