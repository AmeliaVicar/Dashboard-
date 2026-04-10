import { formatDateTime, formatMoney } from "@/lib/format";
import type { OrderRow } from "@/types/orders";

type RecentOrdersTableProps = {
  orders: OrderRow[];
};

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return <div className="empty-state">Синхронизированные заказы пока отсутствуют.</div>;
  }

  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th>Заказ</th>
          <th>Клиент</th>
          <th>Сумма</th>
          <th>Статус</th>
          <th>Создан</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.retailcrm_id}>
            <td>
              <div className="stack">
                <strong>{order.order_number ?? `#${order.retailcrm_id}`}</strong>
                <span className="muted">RetailCRM ID: {order.retailcrm_id}</span>
              </div>
            </td>
            <td>
              <div className="stack">
                <strong>{order.customer_name || "Без имени"}</strong>
                <span className="muted">{order.customer_phone ?? "Телефон не указан"}</span>
              </div>
            </td>
            <td>{formatMoney(order.total_amount, order.currency)}</td>
            <td>
              <span className="status-badge">{order.status}</span>
            </td>
            <td>{formatDateTime(order.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
