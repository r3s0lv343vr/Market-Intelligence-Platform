import type { Company, CompanySearchHit, CoverageTier, Entity, Filing } from "../types";

/**
 * Entity table (WP 0.5). Identity only — not financials.
 * Coverage: A = watchlist / operating demo names (packs), B = peer-stat candidates,
 * C = funds / other (on demand). Do not ingest every EDGAR filer in P0.
 */
export const ENTITIES: Entity[] = [
  {
    cik: "0001000001",
    ticker: "NSM",
    name: "Northstar Motors",
    aliases: ["Northstar", "North Star Motors"],
    sic: "3711",
    sicTitle: "Motor Vehicles and Passenger Car Bodies",
    industry: "Automobile manufacturing",
    template: "corporate",
    coverageTier: "A",
    fiscalYearEnd: "12-31",
  },
  {
    cik: "0001000002",
    ticker: "HBT",
    name: "Harbor Trust",
    aliases: ["Harbor"],
    sic: "6022",
    sicTitle: "State Commercial Banks",
    industry: "Regional bank",
    template: "bank",
    coverageTier: "A",
    fiscalYearEnd: "12-31",
  },
  {
    cik: "0001000003",
    ticker: "LATT",
    name: "Lattice Soft",
    aliases: ["Lattice"],
    sic: "7372",
    sicTitle: "Prepackaged Software",
    industry: "Application software",
    template: "corporate",
    coverageTier: "A",
    fiscalYearEnd: "01-31",
  },
  {
    cik: "0001000004",
    ticker: "AURX",
    name: "Aurora Coachworks",
    aliases: ["Aurora"],
    sic: "3711",
    sicTitle: "Motor Vehicles and Passenger Car Bodies",
    industry: "Automobile manufacturing",
    template: "corporate",
    coverageTier: "B",
    fiscalYearEnd: "12-31",
  },
  {
    cik: "0001000005",
    ticker: "HLFX",
    name: "Harbor Liquidity Fund",
    aliases: ["Harbor Fund"],
    sic: "6722",
    sicTitle: "Management Investment Offices, Closed-End",
    industry: "Closed-end fund",
    template: "corporate",
    coverageTier: "C",
    fiscalYearEnd: "12-31",
  },
];

export function listEntities(): Entity[] {
  return ENTITIES;
}

export function getEntityByTicker(ticker: string): Entity | undefined {
  const needle = ticker.trim().toLowerCase();
  return ENTITIES.find((e) => e.ticker.toLowerCase() === needle);
}

export function getEntityByCik(cik: string): Entity | undefined {
  return ENTITIES.find((e) => e.cik === cik);
}

export function entitiesByTier(tier: CoverageTier): Entity[] {
  return ENTITIES.filter((e) => e.coverageTier === tier);
}

function latestFiling(filings: Filing[], cik: string): Filing | undefined {
  return filings
    .filter((f) => f.cik === cik)
    .sort((a, b) => b.filedAt.localeCompare(a.filedAt))[0];
}

export function companyFromEntity(entity: Entity, filings: Filing[]): Company {
  const latest = latestFiling(filings, entity.cik);
  return {
    cik: entity.cik,
    ticker: entity.ticker,
    name: entity.name,
    industry: entity.industry,
    template: entity.template,
    sic: entity.sic,
    sicTitle: entity.sicTitle,
    coverageTier: entity.coverageTier,
    fiscalYearEnd: entity.fiscalYearEnd,
    latestPeriod: latest?.periodEnd ?? "",
    latestForm: latest?.form ?? "",
    latestFiledAt: latest?.filedAt ?? "",
  };
}

export function searchEntities(q: string, filings: Filing[], packTickers: Set<string>): CompanySearchHit[] {
  const needle = q.trim().toLowerCase();
  const pool = !needle
    ? ENTITIES
    : ENTITIES.filter((e) => {
        return (
          e.ticker.toLowerCase().includes(needle) ||
          e.name.toLowerCase().includes(needle) ||
          e.cik.includes(needle) ||
          e.industry.toLowerCase().includes(needle) ||
          e.sic.includes(needle) ||
          e.sicTitle.toLowerCase().includes(needle) ||
          e.aliases.some((a) => a.toLowerCase().includes(needle))
        );
      });

  return pool.map((e) => {
    const latest = latestFiling(filings, e.cik);
    return {
      ticker: e.ticker,
      name: e.name,
      cik: e.cik,
      industry: e.industry,
      template: e.template,
      sic: e.sic,
      coverageTier: e.coverageTier,
      hasPack: packTickers.has(e.ticker),
      latestForm: latest?.form ?? null,
      latestPeriod: latest?.periodEnd ?? null,
    };
  });
}

export function assertEntityKeysUnique(rows: Entity[] = ENTITIES): void {
  const ciks = new Set<string>();
  const tickers = new Set<string>();
  for (const row of rows) {
    if (ciks.has(row.cik)) throw new Error(`Duplicate CIK ${row.cik}`);
    if (tickers.has(row.ticker.toUpperCase())) throw new Error(`Duplicate ticker ${row.ticker}`);
    ciks.add(row.cik);
    tickers.add(row.ticker.toUpperCase());
  }
}
