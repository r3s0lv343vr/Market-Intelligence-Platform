import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const READ_API_LIMIT = 60;
export const READ_API_WINDOW_MS = 60_000;

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** In-memory cap on the product API. Does not apply to source agencies. */
export function enforceReadLimit(req: Request, now = Date.now()): NextResponse | null {
  const key = clientKey(req);
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + READ_API_WINDOW_MS });
    return null;
  }
  current.count += 1;
  if (current.count > READ_API_LIMIT) {
    const retry = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Shared packs are already cached; retry shortly." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }
  return null;
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}
