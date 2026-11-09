import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { releaseExpiredReservations } from "@/features/inventory/server/release-expired-reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BEARER_PREFIX = "Bearer ";

function hasValidBearerToken(
  authorization: string | null,
  secret: string,
): boolean {
  if (!authorization?.startsWith(BEARER_PREFIX)) {
    return false;
  }

  const provided = Buffer.from(authorization.slice(BEARER_PREFIX.length));
  const expected = Buffer.from(secret);

  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

/**
 * Vercel Cron entry point for reclaiming expired checkout reservations.
 *
 * Vercel invokes scheduled jobs with `GET` and the configured `CRON_SECRET`
 * as a bearer token. Any request without the exact secret is rejected before
 * touching the database, and failures return a generic message so internals
 * and the secret never leak to the caller.
 */
export async function GET(request: Request): Promise<NextResponse> {
  let secret: string;

  try {
    secret = getServerEnv().CRON_SECRET;
  } catch {
    console.error("CRON_RELEASE_RESERVATIONS_CONFIGURATION_ERROR");
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }

  if (!hasValidBearerToken(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { released } = await releaseExpiredReservations();
    return NextResponse.json({ released }, { status: 200 });
  } catch (error) {
    console.error("CRON_RELEASE_RESERVATIONS_ERROR", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
