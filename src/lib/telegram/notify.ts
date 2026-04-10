import { getEnv } from "@/lib/env";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  claimTelegramNotification,
  markTelegramNotificationError,
  markTelegramNotificationSuccess,
} from "@/lib/supabase/orders-repo";
import { sendTelegramMessage } from "@/lib/telegram/client";
import type { OrderRow } from "@/types/orders";

type NotificationResult = {
  status: "sent" | "skipped" | "failed";
  order: OrderRow;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function shouldSendTelegramNotification(order: OrderRow) {
  return order.total_amount > getEnv().telegramThresholdKzt && !order.telegram_notified;
}

function formatTelegramOrderMessage(order: OrderRow) {
  const orderLabel = order.order_number ?? `#${order.retailcrm_id}`;

  return [
    "<b>Новый high-value заказ</b>",
    `Заказ: <b>${escapeHtml(orderLabel)}</b>`,
    `RetailCRM ID: <code>${order.retailcrm_id}</code>`,
    `Сумма: <b>${escapeHtml(formatMoney(order.total_amount, order.currency))}</b>`,
    `Клиент: ${escapeHtml(order.customer_name || "Без имени")}`,
    `Телефон: ${escapeHtml(order.customer_phone ?? "не указан")}`,
    `Статус: ${escapeHtml(order.status)}`,
    `Дата: ${escapeHtml(formatDateTime(order.created_at))}`,
  ].join("\n");
}

export async function notifyOrderIfNeeded(order: OrderRow): Promise<NotificationResult> {
  if (!shouldSendTelegramNotification(order)) {
    return { status: "skipped", order };
  }

  const claimed = await claimTelegramNotification(order.retailcrm_id);

  if (!claimed) {
    return { status: "skipped", order };
  }

  try {
    await sendTelegramMessage(formatTelegramOrderMessage(order));
    const updatedOrder = await markTelegramNotificationSuccess(order.retailcrm_id);
    return { status: "sent", order: updatedOrder };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Telegram error";
    const updatedOrder = await markTelegramNotificationError(order.retailcrm_id, message);
    return { status: "failed", order: updatedOrder };
  }
}
