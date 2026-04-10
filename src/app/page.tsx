import { getDashboardData } from "@/lib/dashboard/queries";
import { formatDateTime } from "@/lib/format";
import { OrdersChart } from "@/components/orders-chart";
import { RecentOrdersTable } from "@/components/recent-orders-table";
import { SummaryCards } from "@/components/summary-cards";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { summary, chartData, recentOrders, lastSyncedAt } = await getDashboardData();

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1 className="page-title">Mini Orders Dashboard</h1>
          <p className="page-subtitle">
            Server-side витрина заказов из RetailCRM, синхронизированная в Supabase с webhook-путём,
            страховочным backfill и Telegram-уведомлениями для high-value orders.
          </p>
        </div>
        <div className="meta-chip">
          Последняя синхронизация: {lastSyncedAt ? formatDateTime(lastSyncedAt) : "ещё не выполнялась"}
        </div>
      </header>

      <SummaryCards summary={summary} />

      <section className="main-grid">
        <div className="panel card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Динамика заказов</h2>
              <p className="panel-caption">Количество заказов по дням на основе данных из Supabase.</p>
            </div>
          </div>
          <OrdersChart data={chartData} />
        </div>

        <div className="panel card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Последние заказы</h2>
              <p className="panel-caption">Недавние заказы после webhook или backfill синхронизации.</p>
            </div>
          </div>
          <RecentOrdersTable orders={recentOrders} />
        </div>
      </section>
    </main>
  );
}
