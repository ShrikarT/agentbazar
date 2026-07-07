#!/bin/bash
BASE="http://localhost:8000"
PASS=0
FAIL=0

run_test() {
  local label="$1"
  local title="$2"
  local description="$3"
  local reward="${4:-10}"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST: $label"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Post task
  TASK=$(curl -s -X POST "$BASE/api/tasks/" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"$title\",\"description\":\"$description\",\"reward_ada\":$reward}")
  TASK_ID=$(echo "$TASK" | python3 -c "import sys,json; print(json.load(sys.stdin)['task_id'])" 2>/dev/null)
  INTENT=$(echo "$TASK" | python3 -c "import sys,json; print(json.load(sys.stdin)['intents'])" 2>/dev/null)
  echo "Intent detected: $INTENT"

  # Execute
  RESULT=$(curl -s -X POST "$BASE/api/tasks/$TASK_ID/execute")
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
  AGENT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['agents_used'])" 2>/dev/null)
  RESPONSE=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][:600])" 2>/dev/null)

  echo "Agent(s): $AGENT"
  echo "Status: $STATUS"
  echo ""
  echo "--- Response (first 600 chars) ---"
  echo "$RESPONSE"

  if [ "$STATUS" = "completed" ]; then
    echo "✅ PASS"
    PASS=$((PASS+1))
  else
    echo "❌ FAIL"
    FAIL=$((FAIL+1))
  fi
}

echo "╔══════════════════════════════════════════╗"
echo "║   AgentBazaar — Full Agent Test Suite   ║"
echo "╚══════════════════════════════════════════╝"

# ── TECHNICAL: web search ────────────────────────────────────────────────────
run_test \
  "TECHNICAL-1: Web search for bug fix" \
  "Fix CORS error on FastAPI" \
  "My FastAPI backend returns CORS error when called from React frontend on localhost:3000. How do I fix this?"

# ── TECHNICAL: code execution ────────────────────────────────────────────────
run_test \
  "TECHNICAL-2: Execute Python code" \
  "Run this Python code" \
  "Execute this code and tell me the output:
\`\`\`python
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
evens = [n for n in numbers if n % 2 == 0]
total = sum(evens)
print(f'Even numbers: {evens}')
print(f'Sum of evens: {total}')
print(f'Average: {total/len(evens):.2f}')
\`\`\`"

# ── BILLING: account lookup + duplicate refund ───────────────────────────────
run_test \
  "BILLING-1: Duplicate charge + auto refund" \
  "Duplicate charge refund" \
  "I was charged twice for my subscription. My email is alice@example.com. Can you check and process a refund?"

# ── BILLING: account status check ────────────────────────────────────────────
run_test \
  "BILLING-2: Account status" \
  "Check my account status" \
  "Can you check the status of account ACC-003 and tell me why it is suspended and what my transaction history looks like?"

# ── BILLING: plan info ────────────────────────────────────────────────────────
run_test \
  "BILLING-3: Plan comparison" \
  "Compare subscription plans" \
  "What is the difference between the Basic and Pro plans? I want to upgrade. What features do I get?"

# ── FAQ: web search ───────────────────────────────────────────────────────────
run_test \
  "FAQ-1: Cardano research" \
  "What is Cardano Masumi" \
  "What is the Masumi network on Cardano and how does it enable AI agent monetization?"

# ── FAQ: general question ─────────────────────────────────────────────────────
run_test \
  "FAQ-2: General crypto question" \
  "What is ADA" \
  "What is ADA and how is it used in the Cardano ecosystem? What can I do with ADA on AgentBazaar?"

# ── DATA: CSV analysis ────────────────────────────────────────────────────────
run_test \
  "DATA-1: CSV analysis" \
  "Analyze this sales data" \
  "Analyze this data and give me insights:
name,sales,region,month
Alice,1200,North,Jan
Bob,980,South,Jan
Carol,1500,North,Feb
Dave,750,South,Feb
Eve,1800,East,Jan
Frank,620,West,Feb
Grace,2100,East,Feb
Henry,890,North,Jan
What are the top performers and which region has the highest sales?"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║              TEST SUMMARY               ║"
printf  "║  ✅ PASSED: %-4s  ❌ FAILED: %-4s       ║\n" $PASS $FAIL
echo "╚══════════════════════════════════════════╝"
