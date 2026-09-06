import { readJson } from "@/lib/api/read";
import { listMacroSeries } from "@/lib/warehouse";

export async function GET(req: Request) {
  return readJson(req, { series: listMacroSeries() });
}
