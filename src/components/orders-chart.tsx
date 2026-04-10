"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDateOnly } from "@/lib/format";
import type { OrdersPerDayPoint } from "@/types/orders";

type OrdersChartProps = {
  data: OrdersPerDayPoint[];
};

export function OrdersChart({ data }: OrdersChartProps) {
  if (data.length === 0) {
    return <div className="empty-state">Пока нет данных для графика.</div>;
  }

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid stroke="rgba(29, 41, 53, 0.08)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateOnly}
            stroke="rgba(95, 111, 125, 0.9)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis allowDecimals={false} stroke="rgba(95, 111, 125, 0.9)" tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value: number) => [`${value} заказов`, "Количество"]}
            labelFormatter={(label: string) => formatDateOnly(label)}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(29, 41, 53, 0.08)",
              background: "rgba(255,255,255,0.94)",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0f766e"
            strokeWidth={3}
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
