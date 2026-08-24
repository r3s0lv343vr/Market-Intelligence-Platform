import { NextResponse } from "next/server";
import { listSources, warehouseHealth } from "@/lib/warehouse";

export async function GET() {
  return NextResponse.json({ health: warehouseHealth(), sources: listSources() });
}
