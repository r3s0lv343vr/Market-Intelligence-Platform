import { companies, driversByIndustry, facts, filings, MAPPING_VERSION, PACK_VERSION, sources } from "./fixtures";
import { CONCEPTS, identityResidual, resolveConcept } from "./resolver";
import { buildSignals } from "./signals";
import type { CompanyPack, StatementLine } from "./types";

function periodLines(cik: string, periodEnd: string, duration: StatementLine["duration"]): StatementLine[] {
  const subset = facts.filter((f) => f.cik === cik);
  return CONCEPTS.map((c) => resolveConcept(subset, c.concept, periodEnd, duration));
}

function allLines(cik: string): StatementLine[] {
  const periodDurations = [
    ...new Set(
      facts.filter((f) => f.cik === cik).map((f) => `${f.periodEnd}|${f.duration}`),
    ),
  ];
  return periodDurations.flatMap((key) => {
    const [periodEnd, duration] = key.split("|") as [string, StatementLine["duration"]];
    return periodLines(cik, periodEnd, duration);
  });
}

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

export function getCompany(ticker: string) {
  return companies.find((c) => c.ticker.toLowerCase() === ticker.toLowerCase()) ?? null;
}

export function getPack(ticker: string): CompanyPack | null {
  const company = getCompany(ticker);
  if (!company) return null;

  const lines = allLines(company.cik).filter((l) => l.duration === "annual");
  const latestLines = lines.filter((l) => l.periodEnd === company.latestPeriod);
  const residual = identityResidual(latestLines);

  const pack: CompanyPack = {
    company,
    packVersion: PACK_VERSION,
    mappingVersion: MAPPING_VERSION,
    signals: buildSignals(company, lines),
    lines,
    filings: filings.filter((f) => f.cik === company.cik),
    peers: companies
      .filter((c) => c.ticker !== company.ticker)
      .map((c) => {
        const peerLines = allLines(c.cik);
        const periods = [...new Set(peerLines.map((l) => l.periodEnd))].sort();
        const last = c.latestPeriod;
        const prev = periods.filter((p) => p < last).at(-1);
        const rev = peerLines.find((l) => l.concept === "revenue" && l.periodEnd === last)?.value;
        const revP = prev
          ? peerLines.find((l) => l.concept === "revenue" && l.periodEnd === prev)?.value
          : null;
        const inv = peerLines.find((l) => l.concept === "inventory" && l.periodEnd === last)?.value;
        const invP = prev
          ? peerLines.find((l) => l.concept === "inventory" && l.periodEnd === prev)?.value
          : null;
        const op = peerLines.find((l) => l.concept === "operating_income" && l.periodEnd === last)?.value;
        const opP = prev
          ? peerLines.find((l) => l.concept === "operating_income" && l.periodEnd === prev)?.value
          : null;
        return {
          ticker: c.ticker,
          name: c.name,
          revenueGrowth: rev != null && revP ? (rev - revP) / revP : null,
          inventoryGrowth: inv != null && invP ? (inv - invP) / invP : null,
          marginChangePp:
            rev && revP && op != null && opP != null ? op / rev - opP / revP : null,
        };
      }),
    drivers: driversByIndustry[company.industry] ?? [],
  };

  if (residual != null && Math.abs(residual) > 1) {
    pack.signals.unshift({
      id: "identity",
      polarity: "watch",
      title: "Balance-sheet identity residual",
      summary: `Assets − (liabilities + equity) = ${residual.toLocaleString("en-US")}.`,
      trust: "calculated",
      inspect: "Mapping ticket if residual is material.",
      evidence: {
        formula: "assets − (liabilities + equity)",
        inputs: [{ label: "Residual", value: String(residual) }],
      },
    });
  }

  return pack;
}

export function listSources() {
  return sources;
}

export function warehouseHealth() {
  return {
    mode: "fixture",
    liveUpstreamCalls: 0,
    companies: companies.length,
    facts: facts.length,
    packVersion: PACK_VERSION,
    mappingVersion: MAPPING_VERSION,
    note: "User traffic hits this warehouse only. SEC/BLS/BEA are not called.",
  };
}
