import { companies, PACK_VERSION } from "../fixtures";
import { easternDateKey } from "../ingest/schedule";
import { buildAllPacks, buildPack } from "./build";
import { generationFromPacks, PackCatalog } from "./catalog";

const startedAt = new Date().toISOString();

export function seedFixtureCatalog(): PackCatalog {
  const packs = buildAllPacks(PACK_VERSION, 1, startedAt);
  return new PackCatalog(generationFromPacks(1, PACK_VERSION, startedAt, packs));
}

const defaultCatalog = seedFixtureCatalog();

export function getCatalog(): PackCatalog {
  return defaultCatalog;
}

/** Rebuild staging from already-held warehouse data (no SEC). Used to prove the live swap. */
export async function rebuildFromWarehouse(
  catalog: PackCatalog,
  packVersion: string,
  now: Date,
  wait?: () => Promise<void>,
): Promise<{ generation: number; packVersion: string }> {
  const staging = catalog.beginStaging(packVersion);
  try {
    const publishedAt = now.toISOString();
    for (const [index, company] of companies.entries()) {
      const pack = buildPack(company.ticker, packVersion, staging.id, publishedAt);
      if (pack) catalog.writeStaging(company.ticker, pack);
      if (index === 0 && wait) await wait();
    }
    const live = catalog.publish(publishedAt, easternDateKey(now));
    return { generation: live.id, packVersion: live.packVersion };
  } catch (err) {
    catalog.abandonStaging();
    throw err;
  }
}
