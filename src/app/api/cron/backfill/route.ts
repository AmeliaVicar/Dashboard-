import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { runBackfillSync } from "@/lib/sync/backfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronAuthorized(request: Request) {
  const secret = getEnv().cronSecret;

  if (!secret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");

  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron request" }, { status: 401 });
  }

  try {
    const summary = await runBackfillSync();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unhandled backfill error",
      },
      { status: 500 },
    );
  }
}
