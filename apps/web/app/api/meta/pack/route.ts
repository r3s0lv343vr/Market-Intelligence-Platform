import { readJson } from "@/lib/api/read";
import { FILING_DISCLAIMER, PACK_CONTRACT_FIELDS } from "@/lib/packs/contract";
import { warehouseHealth } from "@/lib/warehouse";

export async function GET(req: Request) {
  const health = warehouseHealth();
  return readJson(req, {
    shared: true,
    fields: PACK_CONTRACT_FIELDS,
    disclaimer: FILING_DISCLAIMER,
    packVersion: health.packVersion,
    mappingVersion: health.mappingVersion,
    generation: health.catalog.liveGeneration,
    note: "Two readers of the same ticker share this pack. Reloading does not call a source API.",
  });
}
