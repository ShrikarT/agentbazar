/**
 * generate_wallets.ts — Generate operator + 3 agent wallets for preprod
 *
 * Creates 4 wallets, prints private keys (hex) and addresses.
 * Outputs env vars ready to paste into .env
 *
 * Usage:
 *   npx ts-node scripts/generate_wallets.ts
 */

import {
  Lucid,
  Blockfrost,
  generatePrivateKey,
  getAddressDetails,
} from "@lucid-evolution/lucid";

async function main() {
  const projectId = "preprod2gheQYNDRt2NG6JMBtcmbvQlSN2kpyCZ";

  const lucid = await Lucid(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", projectId),
    "Preprod"
  );

  const wallets = ["OPERATOR", "AGENT_TECHNICAL", "AGENT_BILLING", "AGENT_FAQ"];
  const results: Record<string, { skey: string; addr: string; pkh: string }> = {};

  for (const name of wallets) {
    const privateKey = generatePrivateKey();
    lucid.selectWallet.fromPrivateKey(privateKey);
    const addr = await lucid.wallet().address();
    const details = getAddressDetails(addr);
    const pkh = details.paymentCredential?.hash || "";

    results[name] = { skey: privateKey, addr, pkh };

    console.log(`\n=== ${name} ===`);
    console.log(`  Private Key (hex): ${privateKey}`);
    console.log(`  Address:           ${addr}`);
    console.log(`  PubKey Hash (VKH): ${pkh}`);
  }

  console.log("\n\n========================================");
  console.log("  PASTE THESE INTO YOUR .env FILE");
  console.log("========================================\n");

  const op = results["OPERATOR"];
  console.log(`OPERATOR_SKEY_HEX=${op.skey}`);
  console.log(`OPERATOR_VKH=${op.pkh}`);
  console.log(`AGENT_TECHNICAL_ADDR=${results["AGENT_TECHNICAL"].addr}`);
  console.log(`AGENT_BILLING_ADDR=${results["AGENT_BILLING"].addr}`);
  console.log(`AGENT_FAQ_ADDR=${results["AGENT_FAQ"].addr}`);

  console.log("\n\n========================================");
  console.log("  FUND THESE ADDRESSES WITH tADA");
  console.log("  https://docs.cardano.org/cardano-testnets/tools/faucet/");
  console.log("========================================\n");

  console.log(`1. Operator:  ${op.addr}`);
  console.log(`2. Technical: ${results["AGENT_TECHNICAL"].addr}`);
  console.log(`3. Billing:   ${results["AGENT_BILLING"].addr}`);
  console.log(`4. FAQ:       ${results["AGENT_FAQ"].addr}`);

  console.log("\nFund the OPERATOR address with at least 20 tADA.");
  console.log("Agent addresses need minimal tADA (they receive payment from escrow).\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
