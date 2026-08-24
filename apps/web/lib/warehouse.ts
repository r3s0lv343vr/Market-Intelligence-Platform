import { companies, facts, filings, MAPPING_VERSION, sources } from "./fixtures";
import { ingestStatus } from "./ingest/status";
import { schedulePublic } from "./ingest/schedule";
import { getCatalog } from "./packs/runtime";
import type { CompanyPack } from "./types";

export function searchCompanies(q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return companies;
  return companies.filter(
    (c) =>
      c.ticker.toLowerCase().includes(needle) ||
      c.name.toLowerCase().includes(needle) ||
      c.cik.includes(needle) ||
      c.industry.toLowerCase().includes(needle),
  );
}

export function getPack(ticker: string): CompanyPack | null {
  return getCatalog().get(ticker);
}

export function listSources() {
  return sources;
}

export function warehouseHealth() {
  const ingest = ingestStatus();
  const catalog = getCatalog().snapshot();
  const schedule = schedulePublic();
  return {
    mode: "fixture" as const,
    liveUpstreamCalls: 0,
    companies: companies.length,
    facts: facts.length,
    filings: filings.length,
    packVersion: catalog.livePackVersion,
    mappingVersion: MAPPING_VERSION,
    identity: ingest.identity,
    ingest,
    catalog,
    schedule,
    note: "User traffic hits the live pack only. Ingest, when it runs, writes a staging copy and swaps when ready.",
  };
}
