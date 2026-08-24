import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AGENT_TOKEN, USER_AGENT } from "../identity";
import { BronzeImmutableError, writeBronzeFile } from "./bronze";
import { IngestControlPlane } from "./control-plane";
import {
  assertSecUrlAllowed,
  HostNotAllowedError,
  IngestBlockedError,
  liveIngestDecision,
  SEC_BULK_URLS,
} from "./policy";

const enabledEnv = {
  TRACE_INGEST_ENABLED: "true",
  TRACE_INGEST_CONFIRM: AGENT_TOKEN,
};

test("live ingest is off by default", () => {
  const decision = liveIngestDecision({});
  assert.equal(decision.ok, false);
});

test("live ingest requires TraceMI/0.1 confirm token", () => {
  const decision = liveIngestDecision({
    TRACE_INGEST_ENABLED: "true",
    TRACE_INGEST_CONFIRM: "python-requests/2.31",
  });
  assert.equal(decision.ok, false);
});

test("per-CIK JSON is not an allowed first pull", () => {
  assert.throws(
    () => assertSecUrlAllowed("https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json"),
    HostNotAllowedError,
  );
});

test("bulk zip URLs are on the allowlist", () => {
  assert.equal(assertSecUrlAllowed(SEC_BULK_URLS.companyfacts).hostname, "www.sec.gov");
  assert.equal(assertSecUrlAllowed(SEC_BULK_URLS.submissions).hostname, "www.sec.gov");
});

test("disabled plane never calls fetch", async () => {
  let calls = 0;
  const plane = new IngestControlPlane({}, async () => {
    calls += 1;
    return new Response("no", { status: 200 });
  });
  await assert.rejects(() => plane.secGet(SEC_BULK_URLS.companyfacts), IngestBlockedError);
  assert.equal(calls, 0);
  assert.equal(plane.snapshot().requestsSent, 0);
});

test("identified GET sends locked User-Agent and no generic client string", async () => {
  let seen: Headers | undefined;
  const plane = new IngestControlPlane(enabledEnv, async (_url, init) => {
    seen = init.headers as Headers;
    return new Response("ok", { status: 200 });
  });
  await plane.secGet(SEC_BULK_URLS.companyfacts);
  assert.ok(seen);
  assert.equal(seen.get("User-Agent"), USER_AGENT);
  assert.equal(seen.get("Accept-Encoding"), "identity");
  assert.match(seen.get("User-Agent") ?? "", /Trace Market Intelligence/);
  assert.doesNotMatch(seen.get("User-Agent") ?? "", /python-requests|curl\/|node/i);
});

test("403 opens the circuit and does not retry", async () => {
  let calls = 0;
  const plane = new IngestControlPlane(enabledEnv, async () => {
    calls += 1;
    return new Response("forbidden", { status: 403 });
  });
  await assert.rejects(() => plane.secGet(SEC_BULK_URLS.companyfacts));
  await assert.rejects(() => plane.secGet(SEC_BULK_URLS.companyfacts));
  assert.equal(calls, 1);
  assert.equal(plane.snapshot().circuit, "open");
});

test("token bucket does not burst above one request", async () => {
  let sleeps = 0;
  let t = 0;
  const plane = new IngestControlPlane(
    enabledEnv,
    async () => new Response("ok", { status: 200 }),
    {
      now: () => t,
      sleep: async (ms) => {
        sleeps += 1;
        t += ms;
      },
    },
  );
  await plane.secGet(SEC_BULK_URLS.companyfacts);
  await plane.secGet(SEC_BULK_URLS.submissions);
  assert.equal(sleeps, 1);
  assert.ok(t >= 200);
});

test("bronze objects are write-once", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-bronze-"));
  const bytes = new Uint8Array([1, 2, 3]);
  const first = writeBronzeFile("sec/companyfacts.zip", bytes, {
    sourceUrl: SEC_BULK_URLS.companyfacts,
    retrievedAt: "2026-08-24T00:00:00Z",
  }, dir);
  assert.equal(JSON.parse(readFileSync(`${first.path}.meta.json`, "utf8")).userAgent, USER_AGENT);
  assert.throws(
    () =>
      writeBronzeFile("sec/companyfacts.zip", bytes, {
        sourceUrl: SEC_BULK_URLS.companyfacts,
        retrievedAt: "2026-08-24T00:00:01Z",
      }, dir),
    BronzeImmutableError,
  );
});
