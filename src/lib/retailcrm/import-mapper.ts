import { createHash } from "node:crypto";

import { getEnv } from "@/lib/env";
import type { MockOrder } from "@/types/orders";
import type { RetailCrmCreateOrderInput } from "@/types/retailcrm";

function sanitizeExternalId(value: string): string {
  return value.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_.:-]/g, "-");
}

export function buildMockOrderExternalId(order: MockOrder, index: number): string {
  const rawKey = `${order.phone}|${order.email ?? ""}|${JSON.stringify(order.items)}|${index}`;
  const hash = createHash("sha1").update(rawKey).digest("hex").slice(0, 12);
  return sanitizeExternalId(`mock-${index + 1}-${hash}`);
}

export function mapMockOrderToRetailCrmOrder(order: MockOrder, index: number): RetailCrmCreateOrderInput {
  const externalId = buildMockOrderExternalId(order, index);
  const env = getEnv();

  return {
    externalId,
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    email: order.email,
    orderType: env.retailCrmDefaultOrderType ?? order.orderType ?? "main",
    orderMethod: env.retailCrmDefaultOrderMethod ?? order.orderMethod ?? "shopping-cart",
    status: env.retailCrmDefaultStatus ?? order.status ?? "new",
    countryIso: "KZ",
    delivery: order.delivery?.address
      ? {
          address: {
            city: order.delivery.address.city,
            text: order.delivery.address.text,
          },
        }
      : undefined,
    customFields: order.customFields,
    items: order.items.map((item, itemIndex) => ({
      externalId: `${externalId}-item-${itemIndex + 1}`,
      productName: item.productName,
      quantity: item.quantity,
      initialPrice: item.initialPrice,
    })),
  };
}
