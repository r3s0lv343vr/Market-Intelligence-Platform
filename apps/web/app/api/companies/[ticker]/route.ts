import { readJson } from "@/lib/api/read";
import { getPack } from "@/lib/warehouse";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const pack = getPack(ticker);
  if (!pack) {
    return readJson(req, { error: "Not found" }, { status: 404 });
  }
  return readJson(req, pack);
}
