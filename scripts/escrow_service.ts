/**
 * escrow_service.ts — Lightweight HTTP escrow service
 *
 * Exposes endpoints to lock/release ADA via the Aiken task_escrow contract.
 * Uses Node's built-in http module (no Express dependency).
 *
 * Endpoints:
 *   GET  /health  — returns { status: 'ok' }
 *   POST /lock    — locks ADA in escrow, returns { success, tx_hash, explorer_url }
 *   POST /release — releases ADA with CompleteTask redeemer
 *   POST /balance — returns operator wallet balance
 *
 * Port: 3002
 *
 * Usage:
 *   npx tsx scripts/escrow_service.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from repo root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import {
  Lucid,
  Blockfrost,
  Data,
  applyParamsToScript,
  validatorToAddress,
  type SpendingValidator,
  type LucidEvolution,
} from "@lucid-evolution/lucid";

const PORT = 3002;
const EXPLORER = "https://preprod.cardanoscan.io/transaction";

// ── Cardano setup (initialized once at startup) ──────────────────────────

let lucid: LucidEvolution;
let validator: SpendingValidator;
let scriptAddress: string;
let walletAddr: string;

const DatumSchema = Data.Object({
  task_id: Data.Bytes(),
  poster: Data.Bytes(),
  agent: Data.Bytes(),
  amount: Data.Integer(),
});

const RedeemSchema = Data.Enum([
  Data.Literal("CompleteTask"),
  Data.Literal("RefundPoster"),
]);

async function initLucid() {
  const projectId = process.env.BLOCKFROST_PROJECT_ID_PREPROD;
  const skey = process.env.OPERATOR_SKEY_HEX;
  const operatorVkh = process.env.OPERATOR_VKH;

  if (!projectId || !skey || !operatorVkh) {
    throw new Error(
      "Missing BLOCKFROST_PROJECT_ID_PREPROD, OPERATOR_SKEY_HEX, or OPERATOR_VKH in .env"
    );
  }

  lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      projectId
    ),
    "Preprod"
  );
  lucid.selectWallet.fromPrivateKey(skey);

  // Load the compiled Aiken validator
  const blueprintPath = path.join(
    __dirname,
    "..",
    "contracts",
    "task_escrow",
    "plutus.json"
  );
  if (!fs.existsSync(blueprintPath)) {
    throw new Error(
      "plutus.json not found. Run: cd contracts/task_escrow && aiken build"
    );
  }
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, "utf-8"));
  const compiled = blueprint.validators.find(
    (v: any) => v.title === "escrow.task_escrow.spend"
  );
  if (!compiled) {
    throw new Error("Validator 'escrow.task_escrow.spend' not found in blueprint");
  }

  validator = {
    type: "PlutusV3",
    script: applyParamsToScript(compiled.compiledCode, [operatorVkh]),
  };
  scriptAddress = validatorToAddress("Preprod", validator);
  walletAddr = await lucid.wallet().address();

  console.log("Script address:", scriptAddress);
  console.log("Operator wallet:", walletAddr);
}

// ── Endpoint handlers ────────────────────────────────────────────────────

async function handleHealth(): Promise<object> {
  return { status: "ok" };
}

async function handleLock(body: {
  task_id: string;
  poster_pkh: string;
  agent_pkh: string;
  amount_lovelace: number;
}): Promise<object> {
  const { task_id, poster_pkh, agent_pkh, amount_lovelace } = body;

  if (!task_id || !poster_pkh || !agent_pkh || !amount_lovelace) {
    return {
      success: false,
      error: "Missing required fields: task_id, poster_pkh, agent_pkh, amount_lovelace",
    };
  }

  const lovelace = BigInt(amount_lovelace);
  const taskIdHex = Buffer.from(task_id).toString("hex");

  const datum = Data.to(
    {
      task_id: taskIdHex,
      poster: poster_pkh,
      agent: agent_pkh,
      amount: lovelace,
    },
    DatumSchema as any
  );

  console.log(`[LOCK] task=${task_id} amount=${amount_lovelace} lovelace`);

  const lockTx = await lucid
    .newTx()
    .pay.ToContract(
      scriptAddress,
      { kind: "inline", value: datum },
      { lovelace }
    )
    .complete();
  const lockSigned = await lockTx.sign.withWallet().complete();
  const txHash = await lockSigned.submit();

  console.log(`[LOCK] tx_hash=${txHash}`);

  return {
    success: true,
    tx_hash: txHash,
    explorer_url: `${EXPLORER}/${txHash}`,
  };
}

async function handleRelease(body: {
  lock_tx_hash: string;
  task_id: string;
  poster_pkh: string;
  agent_pkh: string;
  amount_lovelace: number;
}): Promise<object> {
  const { lock_tx_hash, task_id, poster_pkh, agent_pkh, amount_lovelace } = body;

  if (!lock_tx_hash || !task_id) {
    return {
      success: false,
      error: "Missing required fields: lock_tx_hash, task_id",
    };
  }

  const lovelace = BigInt(amount_lovelace || 2_000_000);

  console.log(`[RELEASE] task=${task_id} lock_tx=${lock_tx_hash}`);

  // NOTE: The lock tx must be confirmed on-chain before release can work.
  // If the UTXO is not found, the lock may still be pending confirmation.
  const scriptUtxos = await lucid.utxosAt(scriptAddress);
  console.log(`[RELEASE] Script UTXOs found: ${scriptUtxos.length}`);

  const utxo = scriptUtxos.find((u) => u.txHash === lock_tx_hash);
  if (!utxo) {
    return {
      success: false,
      error: `UTXO not found for lock tx ${lock_tx_hash}. The lock transaction may not be confirmed yet — please wait ~60s and retry.`,
    };
  }

  const redeemer = Data.to("CompleteTask", RedeemSchema as any);

  const releaseTx = await lucid
    .newTx()
    .collectFrom([utxo], redeemer)
    .attach.SpendingValidator(validator)
    .pay.ToAddress(walletAddr, { lovelace })
    .addSigner(walletAddr)
    .complete({ localUPLCEval: false });
  const releaseSigned = await releaseTx.sign.withWallet().complete();
  const txHash = await releaseSigned.submit();

  console.log(`[RELEASE] tx_hash=${txHash}`);

  return {
    success: true,
    tx_hash: txHash,
    explorer_url: `${EXPLORER}/${txHash}`,
  };
}

async function handleRefund(body: {
  lock_tx_hash: string;
  task_id: string;
  poster_pkh: string;
  agent_pkh: string;
  amount_lovelace: number;
}): Promise<object> {
  const { lock_tx_hash, task_id, poster_pkh, agent_pkh, amount_lovelace } = body;

  if (!lock_tx_hash || !task_id) {
    return { success: false, error: "Missing required fields: lock_tx_hash, task_id" };
  }

  const lovelace = BigInt(amount_lovelace || 2_000_000);
  console.log(`[REFUND] task=${task_id} lock_tx=${lock_tx_hash}`);

  const scriptUtxos = await lucid.utxosAt(scriptAddress);
  const utxo = scriptUtxos.find((u) => u.txHash === lock_tx_hash);
  if (!utxo) {
    return { success: false, error: `UTXO not found for lock tx ${lock_tx_hash}.` };
  }

  const redeemer = Data.to("RefundPoster", RedeemSchema as any);

  const refundTx = await lucid
    .newTx()
    .collectFrom([utxo], redeemer)
    .attach.SpendingValidator(validator)
    .pay.ToAddress(walletAddr, { lovelace })
    .addSigner(walletAddr)
    .complete({ localUPLCEval: false });
  const refundSigned = await refundTx.sign.withWallet().complete();
  const txHash = await refundSigned.submit();

  console.log(`[REFUND] tx_hash=${txHash}`);
  return { success: true, tx_hash: txHash, explorer_url: `${EXPLORER}/${txHash}` };
}

async function handleStatus(txHash: string): Promise<object> {
  if (!txHash) return { success: false, error: "Missing txHash" };
  try {
    const projectId = process.env.BLOCKFROST_PROJECT_ID_PREPROD || "";
    // Query blockfrost directly. It returns 404 if tx is in mempool, 200 if confirmed in a block.
    const res = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}`, {
      headers: { project_id: projectId }
    });
    if (res.status === 200) {
      return { success: true, confirmed: true };
    }
    return { success: true, confirmed: false };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function handleBalance(): Promise<object> {
  const utxos = await lucid.utxosAt(walletAddr);
  let totalLovelace = BigInt(0);
  for (const u of utxos) {
    totalLovelace += u.assets.lovelace ?? BigInt(0);
  }
  return {
    success: true,
    address: walletAddr,
    balance_lovelace: totalLovelace.toString(),
    balance_ada: (Number(totalLovelace) / 1_000_000).toFixed(6),
    utxo_count: utxos.length,
  };
}

// ── HTTP server ──────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: object
) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

async function startServer() {
  console.log("Initializing Lucid / Blockfrost...");
  await initLucid();

  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    const url = req.url || "/";

    try {
      if (req.method === "GET" && url === "/health") {
        const result = await handleHealth();
        sendJson(res, 200, result);
      } else if (req.method === "POST" && url === "/lock") {
        const body = JSON.parse(await readBody(req));
        const result = await handleLock(body);
        sendJson(res, 200, result);
      } else if (req.method === "POST" && url === "/release") {
        const body = JSON.parse(await readBody(req));
        const result = await handleRelease(body);
        sendJson(res, 200, result);
      } else if (req.method === "POST" && url === "/refund") {
        const body = JSON.parse(await readBody(req));
        const result = await handleRefund(body);
        sendJson(res, 200, result);
      } else if (req.method === "GET" && url.startsWith("/status/")) {
        const txHash = url.split("/")[2];
        const result = await handleStatus(txHash);
        sendJson(res, 200, result);
      } else if (req.method === "POST" && url === "/balance") {
        const result = await handleBalance();
        sendJson(res, 200, result);
      } else {
        sendJson(res, 404, { error: "Not found" });
      }
    } catch (err: any) {
      console.error(`[ERROR] ${req.method} ${url}:`, err);
      sendJson(res, 500, {
        success: false,
        error: err?.message || String(err),
      });
    }
  });

  server.listen(PORT, () => {
    console.log(`\n🔗 Escrow service running on http://localhost:${PORT}`);
    console.log(`   GET  /health  — health check`);
    console.log(`   POST /lock    — lock ADA in escrow`);
    console.log(`   POST /release — release ADA (CompleteTask)`);
    console.log(`   POST /balance — operator wallet balance\n`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start escrow service:", err);
  process.exit(1);
});
