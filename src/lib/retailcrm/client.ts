import type { RetailCrmOrderReference } from "@/types/orders";
import type {
  RetailCrmApiCreateResponse,
  RetailCrmApiListResponse,
  RetailCrmCreateOrderInput,
  RetailCrmOrder,
} from "@/types/retailcrm";
import { getEnv } from "@/lib/env";

type ListOrdersOptions = {
  page?: number;
  limit?: number;
  site?: string;
  ids?: number[];
  externalIds?: string[];
  updatedAtFrom?: string;
  updatedAtTo?: string;
};

function getRetailCrmApiBaseUrl(): string {
  const { retailCrmBaseUrl } = getEnv();

  if (retailCrmBaseUrl.includes("/api/v")) {
    return retailCrmBaseUrl;
  }

  return `${retailCrmBaseUrl}/api/v5`;
}

function buildRetailCrmUrl(path: string, query?: URLSearchParams): string {
  const url = new URL(`${getRetailCrmApiBaseUrl()}/${path.replace(/^\//, "")}`);
  url.searchParams.set("apiKey", getEnv().retailCrmApiKey);

  if (query) {
    for (const [key, value] of query.entries()) {
      url.searchParams.append(key, value);
    }
  }

  return url.toString();
}

async function retailCrmRequest<T>(path: string, init?: RequestInit, query?: URLSearchParams): Promise<T> {
  const response = await fetch(buildRetailCrmUrl(path, query), {
    ...init,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`RetailCRM returned non-JSON response: ${text}`);
  }

  if (!response.ok) {
    throw new Error(`RetailCRM request failed with ${response.status}: ${text}`);
  }

  if (typeof data === "object" && data !== null && "success" in data && data.success === false) {
    throw new Error(`RetailCRM API error: ${text}`);
  }

  return data as T;
}

function buildOrderFilterQuery(options: ListOrdersOptions): URLSearchParams {
  const query = new URLSearchParams();

  query.set("page", String(options.page ?? 1));
  query.set("limit", String(options.limit ?? 50));
  query.set("site", options.site ?? getEnv().retailCrmSiteCode);

  for (const id of options.ids ?? []) {
    query.append("filter[ids][]", String(id));
  }

  for (const externalId of options.externalIds ?? []) {
    query.append("filter[externalIds][]", externalId);
  }

  if (options.updatedAtFrom) {
    query.set("filter[updatedAtFrom]", options.updatedAtFrom);
  }

  if (options.updatedAtTo) {
    query.set("filter[updatedAtTo]", options.updatedAtTo);
  }

  return query;
}

export async function listRetailCrmOrders(options: ListOrdersOptions = {}) {
  return retailCrmRequest<RetailCrmApiListResponse<RetailCrmOrder>>(
    "orders",
    { method: "GET", headers: {} },
    buildOrderFilterQuery(options),
  );
}

export async function getRetailCrmOrderByReference(reference: RetailCrmOrderReference) {
  const response = await listRetailCrmOrders({
    limit: 20,
    ids: reference.id ? [reference.id] : undefined,
    externalIds: reference.externalId ? [reference.externalId] : undefined,
  });

  return response.orders[0] ?? null;
}

export async function findRetailCrmOrdersByExternalIds(externalIds: string[]) {
  const existingOrders = new Map<string, RetailCrmOrder>();

  for (let index = 0; index < externalIds.length; index += 20) {
    const chunk = externalIds.slice(index, index + 20);

    if (chunk.length === 0) {
      continue;
    }

    const response = await listRetailCrmOrders({ externalIds: chunk, limit: 20 });

    for (const order of response.orders) {
      if (order.externalId) {
        existingOrders.set(order.externalId, order);
      }
    }
  }

  return existingOrders;
}

export async function createRetailCrmOrder(order: RetailCrmCreateOrderInput) {
  const body = new URLSearchParams();
  body.set("site", getEnv().retailCrmSiteCode);
  body.set("order", JSON.stringify(order));

  return retailCrmRequest<RetailCrmApiCreateResponse>("orders/create", {
    method: "POST",
    body,
  });
}
