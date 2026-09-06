import { listEntities, searchEntities } from "./entity/table";
import { companies, facts, filings, MAPPING_VERSION } from "./fixtures";
import { loadSilver } from "./silver/facts";
import { goldLinesForCik } from "./gold/statements";
import { listGovernedSources } from "./governance/registry";
import { listSeries } from "./governance/series";
import { workerHostPlan } from "./ingest/host";
import { ingestStatus } from "./ingest/status";
import { schedulePublic } from "./ingest/schedule";
import { getCatalog } from "./packs/runtime";
import type { CompanyPack, Entity } from "./types";

export function searchCompanies(q: string) {
  const packTickers = new Set(companies.map((c) => c.ticker));
  return searchEntities(q, filings, packTickers);
}

export function getPack(ticker: string): CompanyPack | null {
  return getCatalog().get(ticker);
}

export function getEntity(ticker: string): Entity | undefined {
  return listEntities().find((e) => e.ticker.toLowerCase() === ticker.trim().toLowerCase());
}

export function listSources() {
  return listGovernedSources();
}

export function listMacroSeries() {
  return listSeries();
}

export function listCoverageEntities() {
  return listEntities();
}

export function warehouseHealth() {
  const ingest = ingestStatus();
  const catalog = getCatalog().snapshot();
  const schedule = schedulePublic();
  const entities = listEntities();
  const series = listSeries();
  return {
    mode: "fixture" as const,
    liveUpstreamCalls: 0,
    companies: companies.length,
    entities: entities.length,
    coverage: {
      A: entities.filter((e) => e.coverageTier === "A").length,
      B: entities.filter((e) => e.coverageTier === "B").length,
      C: entities.filter((e) => e.coverageTier === "C").length,
    },
    series: series.length,
    facts: facts.length,
    silverFacts: loadSilver().length,
    goldLines: companies.reduce((n, c) => n + goldLinesForCik(c.cik).length, 0),
    filings: filings.length,
    packVersion: catalog.livePackVersion,
    mappingVersion: MAPPING_VERSION,
    identity: ingest.identity,
    ingest,
    catalog,
    schedule,
    workerHost: workerHostPlan(),
    note: "User traffic hits the live pack only. Ingest, when it runs, writes a staging copy and swaps when ready.",
  };
}
