import { NextResponse } from "next/server";
import { getPack } from "@/lib/warehouse";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const pack = getPack(ticker);
  if (!pack) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(pack);
}
