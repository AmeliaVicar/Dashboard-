import { getRetailCrmOrderByReference } from "@/lib/retailcrm/client";
import { normalizeRetailCrmOrder } from "@/lib/retailcrm/order-normalizer";
import {
  getOrderByRetailCrmId,
  isOrderDataEqual,
  normalizedOrderToOrderRow,
  touchOrderSyncedAt,
  upsertOrder,
} from "@/lib/supabase/orders-repo";
import { notifyOrderIfNeeded } from "@/lib/telegram/notify";
import type { RetailCrmOrderReference, SyncOrderResult } from "@/types/orders";
import type { RetailCrmOrder } from "@/types/retailcrm";

export async function syncRetailCrmOrder(order: RetailCrmOrder): Promise<SyncOrderResult> {
  const normalizedOrder = normalizeRetailCrmOrder(order);
  const existingOrder = await getOrderByRetailCrmId(normalizedOrder.retailcrmId);
  const nextOrderRow = normalizedOrderToOrderRow(normalizedOrder, existingOrder);

  let savedOrder = nextOrderRow;
  let mode: SyncOrderResult["mode"] = existingOrder ? "updated" : "inserted";

  if (existingOrder && isOrderDataEqual(existingOrder, nextOrderRow)) {
    savedOrder = await touchOrderSyncedAt(existingOrder.retailcrm_id);
    mode = "skipped";
  } else {
    savedOrder = await upsertOrder(nextOrderRow);
  }

  const notificationResult = await notifyOrderIfNeeded(savedOrder);

  return {
    mode,
    order: notificationResult.order,
    notification: notificationResult.status,
  };
}

export async function syncOrderByReference(reference: RetailCrmOrderReference) {
  const order = await getRetailCrmOrderByReference(reference);

  if (!order) {
    throw new Error("RetailCRM order not found for webhook/backfill reference");
  }

  return syncRetailCrmOrder(order);
}
