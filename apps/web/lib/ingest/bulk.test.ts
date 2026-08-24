import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AGENT_TOKEN } from "../identity";
import { IngestControlPlane } from "./control-plane";
import { extractLocalZipToBronze, liveBulkDecision, runSecBulkIngest } from "./bulk";
import { diffAccessions, parseMasterIdx } from "./daily-index";
import { ZipSlipError } from "./bronze";
import { extractZipToBronze } from "./zip-extract";

function makeZip(dir: string, name: string, entries: Record<string, string>): string {
  const zipPath = path.join(dir, name);
  const spec = path.join(dir, `${name}.py`);
  writeFileSync(
    spec,
    `
import zipfile
z = zipfile.ZipFile(${JSON.stringify(zipPath)}, "w")
${Object.entries(entries)
  .map(([k, v]) => `z.writestr(${JSON.stringify(k)}, ${JSON.stringify(v)})`)
  .join("\n")}
z.close()
`,
  );
  execFileSync("python3", [spec]);
  return zipPath;
}

const liveEnv = {
  TRACE_INGEST_ENABLED: "true",
  TRACE_INGEST_CONFIRM: AGENT_TOKEN,
  TRACE_INGEST_HOST_ROLE: "worker",
};

test("master.idx parser and accession diff do not imply a fetch", () => {
  const text = `CIK|Company Name|Form Type|Date Filed|Filename
--------------------------------------------------------------------------------
0001000001|NORTHSTAR MOTORS|10-K|2026-02-18|edgar/data/1000001/0001000001-26-000012.txt
0001000002|HARBOR TRUST|10-K|2026-02-27|edgar/data/1000002/0001000002-26-000019.txt
`;
  const rows = parseMasterIdx(text);
  assert.equal(rows.length, 2);
  const diff = diffAccessions(rows, ["0001000001-26-000012"]);
  assert.equal(diff.missingCount, 1);
  assert.equal(diff.missingSample[0]?.accession, "0001000002-26-000019");
});

test("stream extract writes CIK files once and skips on replay", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-zip-"));
  const zipPath = makeZip(dir, "facts.zip", {
    "CIK0001000001.json": '{"cik":"0001000001"}',
    "CIK0001000002.json": '{"cik":"0001000002"}',
  });
  const first = await extractZipToBronze({
    zipPath,
    relativePrefix: "sec/companyfacts/2026-08-24/files",
    sourceUrl: "fixture://facts",
    retrievedAt: "2026-08-24T08:30:00.000Z",
    cwd: dir,
  });
  assert.equal(first.extracted, 2);
  const replay = await extractZipToBronze({
    zipPath,
    relativePrefix: "sec/companyfacts/2026-08-24/files",
    sourceUrl: "fixture://facts",
    retrievedAt: "2026-08-24T08:31:00.000Z",
    cwd: dir,
  });
  assert.equal(replay.extracted, 0);
  assert.equal(replay.skipped, 2);
  assert.match(readFileSync(path.join(dir, "data/bronze/sec/companyfacts/2026-08-24/files/CIK0001000001.json"), "utf8"), /0001000001/);
});

test("zip-slip entries are refused", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-slip-"));
  const zipPath = makeZip(dir, "evil.zip", { "../evil.json": "{}" });
  await assert.rejects(
    () =>
      extractZipToBronze({
        zipPath,
        relativePrefix: "sec/companyfacts/2026-08-24/files",
        sourceUrl: "fixture://evil",
        retrievedAt: "2026-08-24T08:30:00.000Z",
        cwd: dir,
      }),
    (err: unknown) => err instanceof ZipSlipError || (err instanceof Error && /invalid relative path|\.\./.test(err.message)),
  );
});

test("Vercel cannot run live bulk", () => {
  const decision = liveBulkDecision({
    ...liveEnv,
    VERCEL: "1",
  });
  assert.equal(decision.ok, false);
});

test("live bulk streams zips through the identified client and does not fetch missing filings", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-bulk-"));
  const facts = makeZip(dir, "companyfacts.zip", { "CIK0001000001.json": '{"cik":"0001000001"}' });
  const subs = makeZip(dir, "submissions.zip", { "CIK0001000001.json": '{"cik":"0001000001","filings":[]}' });
  const factsBytes = readFileSync(facts);
  const subsBytes = readFileSync(subs);
  const idx = `CIK|Company Name|Form Type|Date Filed|Filename
0001000001|NORTHSTAR|10-K|2026-02-18|edgar/data/1000001/0001000001-26-000012.txt
`;
  let calls = 0;
  const plane = new IngestControlPlane(liveEnv, async (url) => {
    calls += 1;
    if (url.includes("companyfacts.zip")) return new Response(factsBytes, { status: 200 });
    if (url.includes("submissions.zip")) return new Response(subsBytes, { status: 200 });
    if (url.endsWith(".idx")) return new Response(idx, { status: 200 });
    return new Response("no", { status: 404 });
  });
  const result = await runSecBulkIngest({
    now: new Date("2026-08-24T08:30:00.000Z"),
    env: liveEnv,
    cwd: dir,
    plane,
    knownAccessions: [],
  });
  assert.equal(result.action, "bronze-bulk-extracted");
  assert.equal(result.contactedSec, true);
  assert.equal(calls, 3);
  assert.equal(result.indexDiff.missingCount, 1);
  assert.equal(result.userImpact, "none");

  const replay = await runSecBulkIngest({
    now: new Date("2026-08-24T08:30:00.000Z"),
    env: liveEnv,
    cwd: dir,
    plane,
    knownAccessions: [],
  });
  assert.equal(calls, 3);
  assert.equal(replay.contactedSec, false);
});

test("local fixture zip extract never calls fetch", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-local-"));
  const zipPath = makeZip(dir, "local.zip", { "CIK0001000003.json": '{"cik":"0001000003"}' });
  const result = await extractLocalZipToBronze({
    zipBytes: readFileSync(zipPath),
    dataset: "companyfacts",
    now: new Date("2026-08-24T08:30:00.000Z"),
    cwd: dir,
  });
  assert.equal(result.extracted, 1);
});
