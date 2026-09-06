import type { SourceRecord } from "../types";

/**
 * Source-governance registry (WP 0.4).
 * Every connector has limits, attribution, license class, and an update calendar.
 * FRED is not a source of truth and is not registered here.
 * Live agency HTTP is not enabled — these records describe the ingest plane only.
 */
export const SOURCE_REGISTRY: SourceRecord[] = [
  {
    id: "sec",
    name: "SEC EDGAR",
    role: "Company facts and filings (bulk zips, then daily index)",
    license: "Public filings. Extracts are not a substitute for the filing.",
    licenseClass: "public-filing",
    attribution: "U.S. Securities and Exchange Commission, EDGAR.",
    officialHome: "https://www.sec.gov/os/accessing-edgar-data",
    keyEnv: null,
    dailyQueryBudget: "Target 5 req/s, hard 8 req/s, one identity across all machines",
    updateCalendar: "Bulk files ~3:00 a.m. ET; daily master.idx / form.idx",
    lastSuccess: "fixture load",
    status: "fixture",
    requestsToday: 0,
    budgetNote: "0 live SEC requests. 403/429 open a circuit with no retry. Per-CIK JSON is forbidden until bulk bronze exists.",
  },
  {
    id: "bls",
    name: "U.S. Bureau of Labor Statistics",
    role: "CPI, employment, PPI, wages",
    license: "U.S. government work. Cite BLS. Registration required for the published daily query cap.",
    licenseClass: "us-government-work",
    attribution: "U.S. Bureau of Labor Statistics.",
    officialHome: "https://www.bls.gov/developers/",
    keyEnv: "TRACE_BLS_API_KEY",
    dailyQueryBudget: "500 queries/day registered; ≤50 series/request; ≤20 years",
    updateCalendar: "Official BLS release calendar (CPI, CES, PPI)",
    lastSuccess: "not connected",
    status: "fixture",
    requestsToday: 0,
    budgetNote: "Not called. Key lives on the worker host only, never on Vercel.",
  },
  {
    id: "bea",
    name: "U.S. Bureau of Economic Analysis",
    role: "GDP, PCE, private fixed investment, industry value added",
    license: "U.S. government work. Cite BEA. No endorsement implied.",
    licenseClass: "us-government-work",
    attribution: "U.S. Bureau of Economic Analysis.",
    officialHome: "https://apps.bea.gov/api/signup/",
    keyEnv: "TRACE_BEA_USER_ID",
    dailyQueryBudget: "100 req/min and/or 100 MB/min and/or 30 errors/min when keyed",
    updateCalendar: "Official BEA release calendar (NIPA, GDP-by-industry)",
    lastSuccess: "not connected",
    status: "fixture",
    requestsToday: 0,
    budgetNote: "Not called. Prefer NIPA / industry tables over a FRED mirror.",
  },
  {
    id: "eia",
    name: "U.S. Energy Information Administration",
    role: "Oil, gas, and electricity overlay",
    license: "U.S. government work. Cite EIA. API key required.",
    licenseClass: "us-government-work",
    attribution: "U.S. Energy Information Administration.",
    officialHome: "https://www.eia.gov/opendata/",
    keyEnv: "TRACE_EIA_API_KEY",
    dailyQueryBudget: "Throttle; temporary key suspend on abuse; ~5k rows/call typical",
    updateCalendar: "EIA publication calendar (PET, NG, ELEC)",
    lastSuccess: "not connected",
    status: "fixture",
    requestsToday: 0,
    budgetNote: "Not called. Energy overlay only — not a wholesale EIA clone.",
  },
  {
    id: "census",
    name: "U.S. Census Bureau",
    role: "Retail, manufacturing orders, housing, business formation, services",
    license: "U.S. government work. Cite Census. Key recommended.",
    licenseClass: "us-government-work",
    attribution: "U.S. Census Bureau.",
    officialHome: "https://www.census.gov/data/developers.html",
    keyEnv: "TRACE_CENSUS_API_KEY",
    dailyQueryBudget: "500 queries/IP/day without key; higher with key (verify live)",
    updateCalendar: "MARTS, M3, New Residential Construction, BFS, QSS calendars",
    lastSuccess: "not connected",
    status: "fixture",
    requestsToday: 0,
    budgetNote: "Not called. Industry / geo context only.",
  },
  {
    id: "fed",
    name: "Federal Reserve Board",
    role: "H.15 selected rates (federal funds, prime)",
    license: "U.S. government work. Cite the Federal Reserve Board. Prefer H.15 over a FRED mirror.",
    licenseClass: "us-government-work",
    attribution: "Board of Governors of the Federal Reserve System, Statistical Release H.15.",
    officialHome: "https://www.federalreserve.gov/releases/h15/",
    keyEnv: null,
    dailyQueryBudget: "Publication fetch on the H.15 calendar — not a polling loop",
    updateCalendar: "H.15 business-day publication",
    lastSuccess: "not connected",
    status: "fixture",
    requestsToday: 0,
    budgetNote: "Not called. Do not treat FRED series IDs as the source of truth.",
  },
  {
    id: "nyfed",
    name: "Federal Reserve Bank of New York",
    role: "SOFR and household auto-credit conditions",
    license: "U.S. government work. Cite the Federal Reserve Bank of New York.",
    licenseClass: "us-government-work",
    attribution: "Federal Reserve Bank of New York.",
    officialHome: "https://www.newyorkfed.org/markets/reference-rates",
    keyEnv: null,
    dailyQueryBudget: "Publication fetch on NY Fed calendars — not a polling loop",
    updateCalendar: "SOFR daily; Household Debt and Credit quarterly",
    lastSuccess: "not connected",
    status: "fixture",
    requestsToday: 0,
    budgetNote: "Not called. Original NY Fed publications, not a FRED copy.",
  },
  {
    id: "treasury",
    name: "U.S. Department of the Treasury",
    role: "Par yield curve, debt outstanding, DTS cash, MTS receipts",
    license: "U.S. government work / public domain. Cite Treasury Fiscal Data.",
    licenseClass: "us-government-work",
    attribution: "U.S. Department of the Treasury, Fiscal Data.",
    officialHome: "https://fiscaldata.treasury.gov/",
    keyEnv: null,
    dailyQueryBudget: "Filtered GET; prefer bulk-friendly filters",
    updateCalendar: "Daily par yield curve, Debt to the Penny, DTS; monthly MTS",
    lastSuccess: "not connected",
    status: "fixture",
    requestsToday: 0,
    budgetNote: "Not called. Yields come from Treasury, not a FRED alias.",
  },
];

export const GOVERNED_SOURCE_IDS = ["sec", "bls", "bea", "eia", "census", "fed", "nyfed", "treasury"] as const;

export function listGovernedSources(): SourceRecord[] {
  return SOURCE_REGISTRY;
}

export function getSource(id: string): SourceRecord | undefined {
  return SOURCE_REGISTRY.find((s) => s.id === id);
}

export function isFredRegistered(): boolean {
  return SOURCE_REGISTRY.some((s) => s.id === "fred" || /fred/i.test(s.name));
}
