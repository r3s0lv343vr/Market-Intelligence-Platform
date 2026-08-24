import { NextResponse } from "next/server";
import { runScheduledTick } from "@/lib/ingest/job";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Clock endpoint. Does not call SEC. User pages never wait on this. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "Cron is not armed. Set CRON_SECRET. This endpoint never downloads EDGAR." },
      { status: 401 },
    );
  }
  const result = await runScheduledTick();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return GET(req);
}
