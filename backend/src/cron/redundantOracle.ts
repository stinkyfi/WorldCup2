import "dotenv/config";

import { prisma } from "../db.js";
import { runOracleCron } from "./primaryOracle.js";

// Redundant cron is the same posting logic as primary, but with a distinct source label
// for auditability. It is expected to run on an independent scheduler/host.
runOracleCron({ source: "redundant" })
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    const message = (e as Error | null | undefined)?.message ?? String(e);
    await prisma.oracleError
      .create({ data: { chainId: 0, groupId: null, message: "redundantOracle fatal", details: message.slice(0, 2_000) } })
      .catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exitCode = 1;
  });

