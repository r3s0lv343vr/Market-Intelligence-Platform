import type { RawFact } from "../types";
import { inferDuration, padCik, toSilver } from "./facts";
import type { SilverFact } from "../types";

type CompanyFactsUnit = {
  end: string;
  start?: string;
  val: number;
  accn: string;
  form?: string;
  filed?: string;
  fp?: string;
  segments?: unknown;
};

type CompanyFactsFile = {
  cik?: number | string;
  facts?: Record<string, Record<string, { units?: Record<string, CompanyFactsUnit[]> }>>;
};

/**
 * Parse a companyfacts JSON object already on disk (bronze).
 * Used after a worker extracts zips. Never fetches data.sec.gov.
 */
export function parseCompanyFactsJson(body: unknown): SilverFact[] {
  const file = body as CompanyFactsFile;
  if (!file || typeof file !== "object" || !file.facts) return [];
  const cik = padCik(file.cik ?? "");
  const out: RawFact[] = [];

  for (const [taxonomy, tags] of Object.entries(file.facts)) {
    if (!tags || typeof tags !== "object") continue;
    for (const [tag, node] of Object.entries(tags)) {
      const units = node?.units ?? {};
      for (const [unit, rows] of Object.entries(units)) {
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          if (!row || row.val == null || !row.end || !row.accn) continue;
          const dimensions =
            row.segments == null ? "" : typeof row.segments === "string" ? row.segments : JSON.stringify(row.segments);
          out.push({
            cik,
            taxonomy,
            tag,
            unit,
            periodEnd: row.end,
            duration: inferDuration(row.start, row.end, row.fp),
            value: row.val,
            accession: row.accn,
            form: row.form ?? "",
            filedAt: row.filed ?? "",
            dimensions,
          });
        }
      }
    }
  }

  const byKey = new Map<string, SilverFact>();
  for (const fact of out) {
    const silver = toSilver(fact);
    byKey.set(silver.factKey, silver);
  }
  return [...byKey.values()];
}
