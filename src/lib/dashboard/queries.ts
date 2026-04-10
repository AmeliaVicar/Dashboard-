import { getLastSyncedAt, listAllOrders, listRecentOrders } from "@/lib/supabase/orders-repo";
import type { DashboardSummary, OrdersPerDayPoint } from "@/types/orders";

function buildSummary(
  totalOrders: number,
  totalRevenue: number,
  highValueOrdersCount: number,
  currency: string,
): DashboardSummary {
  return {
    totalOrders,
    totalRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    highValueOrdersCount,
    currency,
  };
}

function buildOrdersPerDayChart(createdAtValues: string[]): OrdersPerDayPoint[] {
  const perDay = new Map<string, number>();

  for (const createdAt of createdAtValues) {
    const dayKey = createdAt.slice(0, 10);
    perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + 1);
  }

  return [...perDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, count }));
}

export async function getDashboardData() {
  const [orders, recentOrders, lastSyncedAt] = await Promise.all([
    listAllOrders(),
    listRecentOrders(),
    getLastSyncedAt(),
  ]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const highValueOrdersCount = orders.filter((order) => Number(order.total_amount) > 50000).length;
  const dominantCurrency = orders[0]?.currency ?? "KZT";

  return {
    summary: buildSummary(totalOrders, totalRevenue, highValueOrdersCount, dominantCurrency),
    chartData: buildOrdersPerDayChart(orders.map((order) => order.created_at)),
    recentOrders,
    lastSyncedAt,
  };
}
