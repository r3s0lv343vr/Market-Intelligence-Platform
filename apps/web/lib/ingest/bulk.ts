import { existsSync, readFileSync } from "node:fs";
import { AGENT_TOKEN } from "../identity";
import { bronzePath, writeBronzeFile } from "./bronze";
import { IngestControlPlane } from "./control-plane";
import { diffAccessions, masterIdxUrl, parseMasterIdx } from "./daily-index";
import { liveIngestDecision, SEC_BULK_URLS, type IngestEnv } from "./policy";
import { easternDateKey } from "./schedule";
import { extractZipToBronze, streamWebBodyToBronze } from "./zip-extract";

export function isEphemeralServingHost(env: IngestEnv = process.env): boolean {
  return env.VERCEL === "1" || Boolean(env.AWS_LAMBDA_FUNCTION_NAME) || env.TRACE_INGEST_HOST_ROLE !== "worker";
}

export function liveBulkDecision(env: IngestEnv = process.env): { ok: true } | { ok: false; reason: string } {
  const live = liveIngestDecision(env);
  if (!live.ok) return live;
  if (env.VERCEL === "1") {
    return { ok: false, reason: "Vercel is the serving plane. Bulk zips are not downloaded here." };
  }
  if (env.TRACE_INGEST_HOST_ROLE !== "worker") {
    return { ok: false, reason: "TRACE_INGEST_HOST_ROLE must be worker for bulk zip ingest." };
  }
  if (env.TRACE_INGEST_CONFIRM !== AGENT_TOKEN) {
    return { ok: false, reason: "TRACE_INGEST_CONFIRM must equal TraceMI/0.1." };
  }
  return { ok: true };
}

async function saveZip(
  plane: IngestControlPlane,
  url: string,
  relativeName: string,
  retrievedAt: string,
  cwd: string,
): Promise<{ skipped: boolean; path: string }> {
  const dest = bronzePath(relativeName, cwd);
  if (existsSync(dest)) {
    return { skipped: true, path: dest };
  }
  const response = await plane.secGet(url);
  if (!response.body) {
    throw new Error(`Empty body for ${url}`);
  }
  const written = await streamWebBodyToBronze(
    response.body,
    relativeName,
    { sourceUrl: url, retrievedAt },
    cwd,
    "skip",
  );
  return { skipped: written.skipped, path: written.path };
}

export async function runSecBulkIngest(opts: {
  now?: Date;
  env?: IngestEnv;
  cwd?: string;
  plane?: IngestControlPlane;
  knownAccessions?: Iterable<string>;
}) {
  const env = opts.env ?? process.env;
  const decision = liveBulkDecision(env);
  if (!decision.ok) {
    return { contactedSec: false as const, action: "bulk-blocked" as const, reason: decision.reason };
  }

  const now = opts.now ?? new Date();
  const day = easternDateKey(now);
  const retrievedAt = now.toISOString();
  const cwd = opts.cwd ?? process.cwd();
  const plane = opts.plane ?? new IngestControlPlane(env);
  const sentBefore = plane.snapshot().requestsSent;

  const factsRel = `sec/companyfacts/${day}/companyfacts.zip`;
  const subsRel = `sec/submissions/${day}/submissions.zip`;

  const factsZip = await saveZip(plane, SEC_BULK_URLS.companyfacts, factsRel, retrievedAt, cwd);
  const factsExtract = await extractZipToBronze({
    zipPath: factsZip.path,
    relativePrefix: `sec/companyfacts/${day}/files`,
    sourceUrl: SEC_BULK_URLS.companyfacts,
    retrievedAt,
    cwd,
  });

  const subsZip = await saveZip(plane, SEC_BULK_URLS.submissions, subsRel, retrievedAt, cwd);
  const subsExtract = await extractZipToBronze({
    zipPath: subsZip.path,
    relativePrefix: `sec/submissions/${day}/files`,
    sourceUrl: SEC_BULK_URLS.submissions,
    retrievedAt,
    cwd,
  });

  const idxUrl = masterIdxUrl(now);
  const idxRel = `sec/daily-index/${day}/master.idx`;
  const idxDest = bronzePath(idxRel, cwd);
  let idxText = "";
  if (existsSync(idxDest)) {
    idxText = readFileSync(idxDest, "utf8");
  } else {
    const idxRes = await plane.secGet(idxUrl);
    idxText = await idxRes.text();
    writeBronzeFile(idxRel, new TextEncoder().encode(idxText), { sourceUrl: idxUrl, retrievedAt }, cwd);
  }
  const indexDiff = diffAccessions(parseMasterIdx(idxText), opts.knownAccessions ?? []);

  const diffRel = `sec/daily-index/${day}/diff.json`;
  if (!existsSync(bronzePath(diffRel, cwd))) {
    writeBronzeFile(
      diffRel,
      new TextEncoder().encode(
        JSON.stringify(
          {
            note: "Missing accessions are listed only. WP 0.3 does not fetch filing .txt or per-CIK JSON.",
            ...indexDiff,
          },
          null,
          2,
        ),
      ),
      { sourceUrl: idxUrl, retrievedAt },
      cwd,
    );
  }

  return {
    contactedSec: plane.snapshot().requestsSent > sentBefore,
    action: "bronze-bulk-extracted" as const,
    userImpact: "none" as const,
    day,
    requestsSent: plane.snapshot().requestsSent - sentBefore,
    companyfacts: { zipSkipped: factsZip.skipped, ...factsExtract },
    submissions: { zipSkipped: subsZip.skipped, ...subsExtract },
    indexDiff,
  };
}

export async function extractLocalZipToBronze(opts: {
  zipBytes: Uint8Array;
  dataset: "companyfacts" | "submissions";
  now?: Date;
  cwd?: string;
}) {
  const now = opts.now ?? new Date();
  const day = easternDateKey(now);
  const cwd = opts.cwd ?? process.cwd();
  const relative = `sec/${opts.dataset}/${day}/${opts.dataset}.zip`;
  const written = writeBronzeFile(relative, opts.zipBytes, {
    sourceUrl: "fixture://local-zip",
    retrievedAt: now.toISOString(),
  }, cwd);
  return extractZipToBronze({
    zipPath: written.path,
    relativePrefix: `sec/${opts.dataset}/${day}/files`,
    sourceUrl: "fixture://local-zip",
    retrievedAt: now.toISOString(),
    cwd,
  });
}
