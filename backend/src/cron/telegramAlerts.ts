import "dotenv/config";
import { prisma } from "../db.js";
import { oracleControllerAbi } from "../lib/oracleControllerAbi.js";
import { type Address, createPublicClient, getAddress, http } from "viem";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function parseCsvInts(v: string): number[] {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

function groupLabel(groupId: number): string {
  const letters = "ABCDEFGHIJKL";
  return groupId >= 0 && groupId < 12 ? `Group ${letters[groupId]} (${groupId})` : `Group ${groupId}`;
}

async function sendTelegramAlert(text: string): Promise<void> {
  const webhook = process.env.TELEGRAM_WEBHOOK_URL;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (webhook && webhook.trim() !== "") {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
    return;
  }

  if (!botToken || !chatId) {
    throw new Error("Missing TELEGRAM_WEBHOOK_URL or (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)");
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram returned ${res.status}`);
}

async function main() {
  const chainIds = parseCsvInts(mustGetEnv("ORACLE_CHAIN_IDS"));
  const nowSeconds = Math.floor(Date.now() / 1000);

  for (const chainId of chainIds) {
    const rpcUrl = mustGetEnv(`RPC_URL_${chainId}`);
    const oracleController = getAddress(mustGetEnv(`ORACLE_CONTROLLER_${chainId}`)) as Address;
    const publicClient = createPublicClient({ transport: http(rpcUrl) });

    for (let groupId = 0; groupId < 12; groupId++) {
      try {
        const deadline = await publicClient.readContract({
          address: oracleController,
          abi: oracleControllerAbi,
          functionName: "expectedDeadline",
          args: [groupId],
        });

        // If no deadline configured, skip (story 5.5 handles grace extension / deadline mgmt).
        if (!deadline || deadline === 0n) continue;
        if (BigInt(nowSeconds) <= deadline) continue;

        const posted = await publicClient.readContract({
          address: oracleController,
          abi: oracleControllerAbi,
          functionName: "hasResultsPosted",
          args: [groupId],
        });
        if (posted) continue;

        const msg = [
          `DegenDraft oracle alert`,
          `- chainId: ${chainId}`,
          `- ${groupLabel(groupId)}`,
          `- expectedDeadline: ${deadline.toString()} (unix seconds)`,
          `- status: missing on-chain results`,
        ].join("\n");

        try {
          await sendTelegramAlert(msg);
        } catch (e) {
          const message = (e as Error | null | undefined)?.message ?? "Unknown alert error";
          await prisma.alertError.create({
            data: { chainId, groupId, message, details: message.slice(0, 2000) },
          });
        }
      } catch (e) {
        const message = (e as Error | null | undefined)?.message ?? "Unknown monitor error";
        await prisma.alertError
          .create({ data: { chainId, groupId, message: "monitor failure", details: message.slice(0, 2000) } })
          .catch(() => undefined);
      }
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    const message = (e as Error | null | undefined)?.message ?? String(e);
    await prisma.alertError
      .create({ data: { chainId: 0, groupId: null, message: "telegramAlerts fatal", details: message.slice(0, 2000) } })
      .catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exitCode = 1;
  });

