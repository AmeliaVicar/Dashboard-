import { getEnv } from "@/lib/env";
import { listRetailCrmOrders } from "@/lib/retailcrm/client";
import { syncRetailCrmOrder } from "@/lib/sync/sync-order";

export type BackfillSummary = {
  from: string;
  to: string;
  mode: "updated_at_filter" | "full_scan_fallback";
  pages: number;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  notificationsSent: number;
  notificationsSkipped: number;
  notificationsFailed: number;
  errors: string[];
};

function toRetailCrmDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function runBackfillSync() {
  const env = getEnv();
  const now = new Date();
  const fromDate = new Date(now.getTime() - env.backfillLookbackHours * 60 * 60 * 1000);

  const summary: BackfillSummary = {
    from: toRetailCrmDateTime(fromDate),
    to: toRetailCrmDateTime(now),
    mode: "updated_at_filter",
    pages: 0,
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    notificationsSent: 0,
    notificationsSkipped: 0,
    notificationsFailed: 0,
    errors: [],
  };

  let page = 1;
  let totalPages = 1;
  let useUpdatedAtFilter = true;

  while (page <= totalPages) {
    let response;

    try {
      response = await listRetailCrmOrders({
        page,
        limit: 50,
        updatedAtFrom: useUpdatedAtFilter ? summary.from : undefined,
        updatedAtTo: useUpdatedAtFilter ? summary.to : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown RetailCRM list orders error";

      const shouldFallback =
        page === 1 &&
        useUpdatedAtFilter &&
        (message.includes("updatedAtFrom") || message.includes("updatedAtTo") || message.includes("Filter does not exist"));

      if (!shouldFallback) {
        throw error;
      }

      useUpdatedAtFilter = false;
      summary.mode = "full_scan_fallback";
      summary.errors.push("RetailCRM does not support updatedAt filters; switched to full scan fallback");

      response = await listRetailCrmOrders({
        page,
        limit: 50,
      });
    }

    summary.pages += 1;
    summary.fetched += response.orders.length;
    totalPages = response.pagination?.totalPageCount ?? page;

    for (const order of response.orders) {
      try {
        const result = await syncRetailCrmOrder(order);
        summary[result.mode] += 1;

        if (result.notification === "sent") {
          summary.notificationsSent += 1;
        } else if (result.notification === "failed") {
          summary.notificationsFailed += 1;
        } else {
          summary.notificationsSkipped += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.errors.push(error instanceof Error ? error.message : "Unknown backfill error");
      }
    }

    page += 1;
  }

  return summary;
}
