import { NextRequest } from "next/server";
import { readJson } from "@/lib/api/read";
import { searchCompanies } from "@/lib/warehouse";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return readJson(req, { companies: searchCompanies(q) });
}
