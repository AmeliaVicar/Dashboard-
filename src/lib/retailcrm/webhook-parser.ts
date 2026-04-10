import type { RetailCrmOrderReference } from "@/types/orders";
import type { RetailCrmOrder } from "@/types/retailcrm";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value);
  }

  return null;
}

function looksLikeRetailCrmOrder(value: unknown): value is RetailCrmOrder {
  if (!isRecord(value) || typeof value.id !== "number") {
    return false;
  }

  return (
    Array.isArray(value.items) ||
    typeof value.status === "string" ||
    typeof value.createdAt === "string" ||
    typeof value.firstName === "string" ||
    typeof value.phone === "string"
  );
}

export function extractEmbeddedRetailCrmOrder(payload: unknown): RetailCrmOrder | null {
  if (looksLikeRetailCrmOrder(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return null;
  }

  if (looksLikeRetailCrmOrder(payload.order)) {
    return payload.order;
  }

  if (Array.isArray(payload.orders) && looksLikeRetailCrmOrder(payload.orders[0])) {
    return payload.orders[0];
  }

  return null;
}

export function extractOrderReferenceFromWebhook(payload: unknown): RetailCrmOrderReference | null {
  if (!isRecord(payload)) {
    return null;
  }

  const candidates: RetailCrmOrderReference[] = [];
  const payloadId = parseNumericId(payload.id);

  if (payloadId !== null) {
    candidates.push({ id: payloadId });
  }

  if (typeof payload.externalId === "string") {
    candidates.push({ externalId: payload.externalId });
  }

  if (isRecord(payload.order)) {
    const orderId = parseNumericId(payload.order.id);

    if (orderId !== null) {
      candidates.push({ id: orderId });
    }

    if (typeof payload.order.externalId === "string") {
      candidates.push({ externalId: payload.order.externalId });
    }
  }

  if (Array.isArray(payload.orders) && payload.orders.length > 0 && isRecord(payload.orders[0])) {
    const firstOrder = payload.orders[0];
    const firstOrderId = parseNumericId(firstOrder.id);

    if (firstOrderId !== null) {
      candidates.push({ id: firstOrderId });
    }

    if (typeof firstOrder.externalId === "string") {
      candidates.push({ externalId: firstOrder.externalId });
    }
  }

  return candidates[0] ?? null;
}
