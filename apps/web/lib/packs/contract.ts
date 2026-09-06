import type { CompanyPack } from "../types";

export const FILING_DISCLAIMER =
  "Extracts are not a substitute for the filing. This is not investment advice.";

export const PACK_CONTRACT_FIELDS = [
  "company",
  "packVersion",
  "mappingVersion",
  "generation",
  "publishedAt",
  "shared",
  "disclaimer",
  "signals",
  "lines",
  "filings",
  "peers",
  "drivers",
] as const;

export function assertPackContract(pack: CompanyPack): void {
  for (const field of PACK_CONTRACT_FIELDS) {
    if (pack[field] == null) {
      throw new Error(`Pack contract missing ${field}`);
    }
  }
  if (pack.shared !== true) {
    throw new Error("Packs are shared artifacts. Do not mint a per-user copy.");
  }
  if (!pack.disclaimer.includes("not a substitute")) {
    throw new Error("Pack must carry the filing disclaimer.");
  }
}

export function packFingerprint(pack: CompanyPack): string {
  return [pack.company.ticker, pack.generation, pack.packVersion, pack.mappingVersion, pack.publishedAt].join(":");
}
