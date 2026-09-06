import { NextResponse } from "next/server";
import { listMacroSeries } from "@/lib/warehouse";

export async function GET() {
  return NextResponse.json({ series: listMacroSeries() });
}
