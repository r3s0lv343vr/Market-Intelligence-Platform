import { NextResponse } from "next/server";
import { enforceReadLimit } from "./rate-limit";

export function readJson(req: Request, body: unknown, init?: { status?: number }) {
  const limited = enforceReadLimit(req);
  if (limited) return limited;
  return NextResponse.json(body, init);
}
