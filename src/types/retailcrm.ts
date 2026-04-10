import type { Json } from "@/types/orders";

export type RetailCrmApiListResponse<T> = {
  success: boolean;
  orders: T[];
  pagination?: {
    totalCount?: number;
    currentPage?: number;
    perPage?: number;
    totalPageCount?: number;
  };
  errors?: string[];
};

export type RetailCrmApiCreateResponse = {
  success: boolean;
  id?: number;
  errors?: string[];
};

export type RetailCrmOrderItem = {
  id?: number;
  externalId?: string;
  productName?: string;
  quantity?: number;
  initialPrice?: number;
  offer?: {
    id?: number;
    externalId?: string;
  };
};

export type RetailCrmOrder = {
  id: number;
  externalId?: string;
  number?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  orderType?: string;
  orderMethod?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  site?: string;
  summ?: number;
  totalSumm?: number;
  currency?: string;
  customerComment?: string;
  customFields?: Record<string, Json>;
  delivery?: {
    code?: string;
    address?: {
      city?: string;
      text?: string;
    };
  };
  items?: RetailCrmOrderItem[];
};

export type RetailCrmCreateOrderInput = {
  externalId: string;
  number?: string;
  createdAt?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  orderType?: string;
  orderMethod?: string;
  status?: string;
  countryIso?: string;
  delivery?: {
    code?: string;
    address?: {
      city?: string;
      text?: string;
    };
  };
  items: Array<{
    externalId: string;
    productName: string;
    quantity: number;
    initialPrice: number;
  }>;
  customFields?: Record<string, Json>;
};
