import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bronzePath, bronzeRoot } from "./bronze";

/** Dated bulk zips kept for replay. Live CIK extract is one generation, not one tree per night. */
export const ZIP_DAYS_TO_KEEP = 2;

export type BulkDataset = "companyfacts" | "submissions";

const DAY_DIR = /^\d{4}-\d{2}-\d{2}$/;

export function liveFilesPrefix(dataset: BulkDataset): string {
  return `sec/${dataset}/live/files`;
}

export function liveMarkerRel(dataset: BulkDataset): string {
  return `sec/${dataset}/live/EXTRACTED.json`;
}

export function zipRel(dataset: BulkDataset, day: string): string {
  return `sec/${dataset}/${day}/${dataset}.zip`;
}

export function liveExtractDone(cwd: string, dataset: BulkDataset): boolean {
  return existsSync(bronzePath(liveMarkerRel(dataset), cwd));
}

export function markLiveExtract(
  cwd: string,
  dataset: BulkDataset,
  meta: { day: string; extracted: number; skipped: number },
): void {
  const dest = bronzePath(liveMarkerRel(dataset), cwd);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(
    dest,
    JSON.stringify(
      {
        dataset,
        firstExtractDay: meta.day,
        extracted: meta.extracted,
        skipped: meta.skipped,
        note: "Live CIK files are the first full extract. Later nights CRC-compare the new zip and rewrite only changed CIKs; they do not unpack a second universe.",
      },
      null,
      2,
    ),
  );
}

/**
 * Keep the newest dated zip folders; never delete `live/`.
 * Zips are ~4–6 GB/night. Unpacked JSON must not accumulate that way.
 */
export function pruneOldDatasetZips(
  cwd: string,
  dataset: BulkDataset,
  keepNewest = ZIP_DAYS_TO_KEEP,
): { deleted: string[] } {
  const root = path.join(bronzeRoot(cwd), "sec", dataset);
  if (!existsSync(root)) return { deleted: [] };
  const days = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && DAY_DIR.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const drop = days.slice(0, Math.max(0, days.length - keepNewest));
  const deleted: string[] = [];
  for (const day of drop) {
    rmSync(path.join(root, day), { recursive: true, force: true });
    deleted.push(day);
  }
  return { deleted };
}
