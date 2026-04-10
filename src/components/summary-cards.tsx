import { formatMoney } from "@/lib/format";
import type { DashboardSummary } from "@/types/orders";

type SummaryCardsProps = {
  summary: DashboardSummary;
};

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { label: "Всего заказов", value: summary.totalOrders.toLocaleString("ru-RU") },
    { label: "Выручка", value: formatMoney(summary.totalRevenue, summary.currency) },
    { label: "Средний чек", value: formatMoney(summary.averageOrderValue, summary.currency) },
    { label: "Заказов > 50 000 ₸", value: summary.highValueOrdersCount.toLocaleString("ru-RU") },
  ];

  return (
    <section className="cards-grid">
      {cards.map((card) => (
        <div className="panel card" key={card.label}>
          <div className="card-label">{card.label}</div>
          <div className="card-value">{card.value}</div>
        </div>
      ))}
    </section>
  );
}
