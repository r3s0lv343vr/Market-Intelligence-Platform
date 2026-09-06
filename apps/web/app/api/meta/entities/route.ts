import { readJson } from "@/lib/api/read";
import { listCoverageEntities } from "@/lib/warehouse";

export async function GET(req: Request) {
  return readJson(req, { entities: listCoverageEntities() });
}
