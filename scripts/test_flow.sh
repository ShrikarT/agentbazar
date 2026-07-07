#!/bin/bash
# AgentBazaar end-to-end API test
BASE="http://localhost:8000"
echo "=== AgentBazaar Test Flow ==="

echo "--- [1] Health ---"
curl -s "$BASE/health" | python3 -m json.tool

echo "--- [2] MIP-003 Availability ---"
curl -s "$BASE/availability" | python3 -m json.tool

echo "--- [3] Post Task (technical) ---"
TASK=$(curl -s -X POST "$BASE/api/tasks/" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fix checkout 500 error","description":"My API is throwing 500 errors on the checkout endpoint when users try to pay. The error appears in the logs as NullPointerException on line 42.","reward_ada":10}')
echo "$TASK" | python3 -m json.tool
TASK_ID=$(echo "$TASK" | python3 -c "import sys,json; print(json.load(sys.stdin)['task_id'])" 2>/dev/null)

echo "--- [4] Get Bids ---"
curl -s "$BASE/api/tasks/$TASK_ID/bids" | python3 -m json.tool

echo "--- [5] Execute Task ---"
curl -s -X POST "$BASE/api/tasks/$TASK_ID/execute" | python3 -m json.tool

echo "--- [6] Complete + Release ADA ---"
curl -s -X POST "$BASE/api/tasks/$TASK_ID/complete" | python3 -m json.tool

echo "--- [7] Post Task (billing) ---"
TASK2=$(curl -s -X POST "$BASE/api/tasks/" \
  -H "Content-Type: application/json" \
  -d '{"title":"Process refund","description":"I was charged twice for my subscription last month and need a refund for the duplicate charge.","reward_ada":5}')
TASK_ID2=$(echo "$TASK2" | python3 -c "import sys,json; print(json.load(sys.stdin)['task_id'])" 2>/dev/null)
curl -s -X POST "$BASE/api/tasks/$TASK_ID2/execute" | python3 -m json.tool

echo ""
echo "=== Test complete ==="
