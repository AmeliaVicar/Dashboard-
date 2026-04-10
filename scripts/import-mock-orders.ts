import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { getEnv } from "@/lib/env";
import { createRetailCrmOrder, findRetailCrmOrdersByExternalIds } from "@/lib/retailcrm/client";
import { buildMockOrderExternalId, mapMockOrderToRetailCrmOrder } from "@/lib/retailcrm/import-mapper";
import type { MockOrder } from "@/types/orders";

function resolveMockOrdersPath() {
  const env = getEnv();
  return path.isAbsolute(env.mockOrdersPath) ? env.mockOrdersPath : path.resolve(process.cwd(), env.mockOrdersPath);
}

async function loadMockOrders(): Promise<MockOrder[]> {
  const filePath = resolveMockOrdersPath();
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("mock_orders.json must contain an array of orders");
  }

  return parsed as MockOrder[];
}

async function main() {
  const mockOrders = await loadMockOrders();
  const externalIds = mockOrders.map((order, index) => buildMockOrderExternalId(order, index));
  const existingOrdersMap = await findRetailCrmOrdersByExternalIds(externalIds);

  let processed = 0;
  let imported = 0;
  let skipped = 0;
  const failed: Array<{ externalId: string; error: string }> = [];

  console.log(`Loaded ${mockOrders.length} orders from ${resolveMockOrdersPath()}`);

  for (const [index, mockOrder] of mockOrders.entries()) {
    processed += 1;
    const externalId = buildMockOrderExternalId(mockOrder, index);

    if (existingOrdersMap.has(externalId)) {
      skipped += 1;
      console.log(`[SKIP] ${externalId} already exists in RetailCRM`);
      continue;
    }

    try {
      const payload = mapMockOrderToRetailCrmOrder(mockOrder, index);
      const response = await createRetailCrmOrder(payload);
      imported += 1;
      console.log(`[OK] ${externalId} imported (RetailCRM ID: ${response.id ?? "unknown"})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown import error";
      failed.push({ externalId, error: message });
      console.error(`[ERROR] ${externalId}: ${message}`);
    }
  }

  console.log("");
  console.log("Import summary");
  console.log(`Processed: ${processed}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped existing: ${skipped}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("Failed orders:");
    for (const entry of failed) {
      console.log(`- ${entry.externalId}: ${entry.error}`);
    }

    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unhandled import script error");
  process.exit(1);
});
