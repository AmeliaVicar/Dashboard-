import type { NormalizedOrder } from "@/types/orders";
import type { RetailCrmOrder } from "@/types/retailcrm";

function toIsoDateString(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.valueOf())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  return 0;
}

function calculateItemsCount(order: RetailCrmOrder): number {
  const rawCount = (order.items ?? []).reduce((accumulator, item) => accumulator + toNumber(item.quantity ?? 0), 0);
  return rawCount > 0 ? rawCount : order.items?.length ?? 0;
}

function calculateTotalAmount(order: RetailCrmOrder): number {
  if (typeof order.totalSumm === "number") {
    return order.totalSumm;
  }

  if (typeof order.summ === "number") {
    return order.summ;
  }

  return (order.items ?? []).reduce((accumulator, item) => {
    return accumulator + toNumber(item.quantity ?? 0) * toNumber(item.initialPrice ?? 0);
  }, 0);
}

export function normalizeRetailCrmOrder(order: RetailCrmOrder): NormalizedOrder {
  const customerName = [order.firstName, order.lastName].filter(Boolean).join(" ").trim() || "Без имени";

  return {
    retailcrmId: order.id,
    externalId: order.externalId ?? null,
    orderNumber: order.number ?? null,
    createdAt: toIsoDateString(order.createdAt),
    updatedAt: toIsoDateString(order.updatedAt ?? order.createdAt),
    status: order.status ?? "unknown",
    customerName,
    customerPhone: order.phone ?? null,
    customerEmail: order.email ?? null,
    city: order.delivery?.address?.city ?? null,
    totalAmount: calculateTotalAmount(order),
    currency: order.currency ?? "KZT",
    itemsCount: calculateItemsCount(order),
    rawPayload: order,
  };
}
