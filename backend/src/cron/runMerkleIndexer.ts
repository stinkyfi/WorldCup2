import "dotenv/config";
import { prisma } from "../db.js";
import { runMerkleIndexerOnce } from "../indexer/merklePoster.js";
import { pathToFileURL } from "node:url";

async function main() {
  await runMerkleIndexerOnce();
}

const isEntrypoint = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isEntrypoint) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect().catch(() => undefined);
      process.exitCode = 1;
    });
}
