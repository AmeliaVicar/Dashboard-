export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type MockOrderItem = {
  productName: string;
  quantity: number;
  initialPrice: number;
};

export type MockOrder = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  orderType?: string;
  orderMethod?: string;
  status?: string;
  items: MockOrderItem[];
  delivery?: {
    address?: {
      city?: string;
      text?: string;
    };
  };
  customFields?: Record<string, Json>;
};

export type RetailCrmOrderReference = {
  id?: number;
  externalId?: string;
};

export type NormalizedOrder = {
  retailcrmId: number;
  externalId: string | null;
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  city: string | null;
  totalAmount: number;
  currency: string;
  itemsCount: number;
  rawPayload: Json;
};

export type OrderRow = {
  id?: number;
  retailcrm_id: number;
  external_id: string | null;
  order_number: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  city: string | null;
  total_amount: number;
  currency: string;
  items_count: number;
  raw_payload: Json;
  synced_at: string;
  telegram_notified: boolean;
  telegram_notified_at: string | null;
  notification_error: string | null;
};

export type SyncMode = "inserted" | "updated" | "skipped";

export type SyncOrderResult = {
  mode: SyncMode;
  order: OrderRow;
  notification: "sent" | "skipped" | "failed";
};

export type DashboardSummary = {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  highValueOrdersCount: number;
  currency: string;
};

export type OrdersPerDayPoint = {
  date: string;
  count: number;
};
