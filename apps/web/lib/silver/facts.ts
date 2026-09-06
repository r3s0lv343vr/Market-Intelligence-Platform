import { facts as fixtureFacts } from "../fixtures";
import type { Duration, RawFact, SilverFact } from "../types";

export function factKey(fact: Pick<RawFact, "cik" | "taxonomy" | "tag" | "unit" | "periodEnd" | "duration" | "accession"> & { dimensions?: string }): string {
  return [
    fact.cik,
    fact.taxonomy,
    fact.tag,
    fact.unit,
    fact.periodEnd,
    fact.duration,
    fact.accession,
    fact.dimensions ?? "",
  ].join("|");
}

export function toSilver(fact: RawFact): SilverFact {
  const dimensions = fact.dimensions ?? "";
  return { ...fact, dimensions, factKey: factKey({ ...fact, dimensions }) };
}

/** Load silver from already-held warehouse facts. Does not call SEC. Replay is a unique-key upsert. */
export function loadSilver(facts: RawFact[] = fixtureFacts): SilverFact[] {
  const byKey = new Map<string, SilverFact>();
  for (const fact of facts) {
    const silver = toSilver(fact);
    byKey.set(silver.factKey, silver);
  }
  return [...byKey.values()];
}

export function silverForCik(cik: string, facts: RawFact[] = fixtureFacts): SilverFact[] {
  return loadSilver(facts).filter((f) => f.cik === cik);
}

export function inferDuration(start: string | undefined, end: string, fp?: string): Duration {
  if (!start) {
    if (fp === "FY") return "annual";
    if (fp === "Q1" || fp === "Q2" || fp === "Q3" || fp === "Q4") return "quarter";
    return "annual";
  }
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
  if (days >= 300) return "annual";
  if (days >= 150) return "ytd";
  return "quarter";
}

export function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}
