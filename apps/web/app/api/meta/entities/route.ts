import { NextResponse } from "next/server";
import { listCoverageEntities } from "@/lib/warehouse";

export async function GET() {
  return NextResponse.json({ entities: listCoverageEntities() });
}
