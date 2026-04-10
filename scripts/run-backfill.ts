import "dotenv/config";

import { runBackfillSync } from "@/lib/sync/backfill";

async function main() {
  const summary = await runBackfillSync();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unhandled backfill script error");
  process.exit(1);
});
