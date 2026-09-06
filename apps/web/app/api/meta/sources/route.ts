import { readJson } from "@/lib/api/read";
import { listSources, warehouseHealth } from "@/lib/warehouse";

export async function GET(req: Request) {
  return readJson(req, { health: warehouseHealth(), sources: listSources() });
}
