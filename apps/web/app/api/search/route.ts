import { NextRequest, NextResponse } from "next/server";
import { searchCompanies } from "@/lib/warehouse";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ companies: searchCompanies(q) });
}
