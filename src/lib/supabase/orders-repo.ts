import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NormalizedOrder, OrderRow } from "@/types/orders";

type ComparableOrderSnapshot = Pick<
  OrderRow,
  | "external_id"
  | "order_number"
  | "created_at"
  | "updated_at"
  | "status"
  | "customer_name"
  | "customer_phone"
  | "customer_email"
  | "city"
  | "total_amount"
  | "currency"
  | "items_count"
  | "raw_payload"
>;

export function normalizedOrderToOrderRow(normalized: NormalizedOrder, previous?: OrderRow | null): OrderRow {
  return {
    retailcrm_id: normalized.retailcrmId,
    external_id: normalized.externalId,
    order_number: normalized.orderNumber,
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
    status: normalized.status,
    customer_name: normalized.customerName,
    customer_phone: normalized.customerPhone,
    customer_email: normalized.customerEmail,
    city: normalized.city,
    total_amount: normalized.totalAmount,
    currency: normalized.currency,
    items_count: normalized.itemsCount,
    raw_payload: normalized.rawPayload,
    synced_at: new Date().toISOString(),
    telegram_notified: previous?.telegram_notified ?? false,
    telegram_notified_at: previous?.telegram_notified_at ?? null,
    notification_error: previous?.notification_error ?? null,
  };
}

function comparableSnapshot(order: ComparableOrderSnapshot) {
  return JSON.stringify(order);
}

export function isOrderDataEqual(existing: OrderRow, next: OrderRow) {
  return (
    comparableSnapshot({
      external_id: existing.external_id,
      order_number: existing.order_number,
      created_at: existing.created_at,
      updated_at: existing.updated_at,
      status: existing.status,
      customer_name: existing.customer_name,
      customer_phone: existing.customer_phone,
      customer_email: existing.customer_email,
      city: existing.city,
      total_amount: existing.total_amount,
      currency: existing.currency,
      items_count: existing.items_count,
      raw_payload: existing.raw_payload,
    }) ===
    comparableSnapshot({
      external_id: next.external_id,
      order_number: next.order_number,
      created_at: next.created_at,
      updated_at: next.updated_at,
      status: next.status,
      customer_name: next.customer_name,
      customer_phone: next.customer_phone,
      customer_email: next.customer_email,
      city: next.city,
      total_amount: next.total_amount,
      currency: next.currency,
      items_count: next.items_count,
      raw_payload: next.raw_payload,
    })
  );
}

export async function getOrderByRetailCrmId(retailcrmId: number) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("retailcrm_id", retailcrmId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase getOrderByRetailCrmId failed: ${error.message}`);
  }

  return data;
}

export async function upsertOrder(order: OrderRow) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("orders")
    .upsert(order, { onConflict: "retailcrm_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Supabase upsertOrder failed: ${error.message}`);
  }

  return data;
}

export async function touchOrderSyncedAt(retailcrmId: number) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("orders")
    .update({ synced_at: new Date().toISOString() })
    .eq("retailcrm_id", retailcrmId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Supabase touchOrderSyncedAt failed: ${error.message}`);
  }

  return data;
}

export async function claimTelegramNotification(retailcrmId: number) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase.rpc("claim_order_notification", {
    p_retailcrm_id: retailcrmId,
  });

  if (error) {
    throw new Error(`Supabase claimTelegramNotification failed: ${error.message}`);
  }

  return Boolean(data);
}

export async function markTelegramNotificationSuccess(retailcrmId: number) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("orders")
    .update({
      telegram_notified: true,
      telegram_notified_at: new Date().toISOString(),
      notification_error: null,
      synced_at: new Date().toISOString(),
    })
    .eq("retailcrm_id", retailcrmId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Supabase markTelegramNotificationSuccess failed: ${error.message}`);
  }

  return data;
}

export async function markTelegramNotificationError(retailcrmId: number, notificationError: string) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("orders")
    .update({
      notification_error: notificationError.slice(0, 1000),
      synced_at: new Date().toISOString(),
    })
    .eq("retailcrm_id", retailcrmId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Supabase markTelegramNotificationError failed: ${error.message}`);
  }

  return data;
}

export async function listAllOrders() {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Supabase listAllOrders failed: ${error.message}`);
  }

  return (data ?? []) as OrderRow[];
}

export async function listRecentOrders(limit = 8) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase listRecentOrders failed: ${error.message}`);
  }

  return (data ?? []) as OrderRow[];
}

export async function getLastSyncedAt() {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("orders")
    .select("synced_at")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase getLastSyncedAt failed: ${error.message}`);
  }

  return data?.synced_at ?? null;
}
