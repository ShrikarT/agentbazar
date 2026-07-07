# TaskEscrow — Aiken Smart Contract

## What it does
Locks ADA for a task. Releases to agent when operator (backend) signs CompleteTask.
Refunds poster if they sign RefundPoster before completion.

## Build
```bash
cd contracts/task_escrow
aiken build
# outputs plutus.json — consumed by Lucid Evolution in frontend/lib/escrow.ts
```

## Key design decisions
- No status field in datum (eUTXO: spend the UTXO, don't mutate it)
- Operator key parameterized at compile time (not a datum field)
- CompleteTask requires operator sig + payment to agent address verified on-chain
- RefundPoster requires poster sig only

## Preprod deployment
After aiken build, run scripts/prove_chain.ts to lock + release tADA.
Both tx hashes appear on preprod.cardanoscan.io — this is the General Track proof.
