import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { extractEmbeddedRetailCrmOrder, extractOrderReferenceFromWebhook } from "@/lib/retailcrm/webhook-parser";
import { syncOrderByReference, syncRetailCrmOrder } from "@/lib/sync/sync-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWebhookAuthorized(request: Request) {
  const secret = getEnv().retailCrmWebhookSecret;

  if (!secret) {
    return true;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-webhook-secret");

  return querySecret === secret || headerSecret === secret;
}

async function parseWebhookPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payloadCandidate = formData.get("payload") ?? formData.get("order");

    if (typeof payloadCandidate === "string") {
      try {
        return JSON.parse(payloadCandidate);
      } catch {
        return { raw: payloadCandidate };
      }
    }

    return Object.fromEntries(formData.entries());
  }

  const rawText = await request.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { raw: rawText };
  }
}

export async function POST(request: Request) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await parseWebhookPayload(request);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const embeddedOrder = extractEmbeddedRetailCrmOrder(payload);

    if (embeddedOrder) {
      const result = await syncRetailCrmOrder(embeddedOrder);

      return NextResponse.json({
        ok: true,
        source: "embedded-order",
        mode: result.mode,
        notification: result.notification,
        retailcrmId: result.order.retailcrm_id,
      });
    }

    const reference = extractOrderReferenceFromWebhook(payload);

    if (!reference) {
      return NextResponse.json(
        { ok: false, error: "Webhook payload does not contain order id or externalId" },
        { status: 400 },
      );
    }

    const result = await syncOrderByReference(reference);

    return NextResponse.json({
      ok: true,
      source: "fetched-from-retailcrm",
      mode: result.mode,
      notification: result.notification,
      retailcrmId: result.order.retailcrm_id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unhandled webhook sync error",
      },
      { status: 500 },
    );
  }
}
