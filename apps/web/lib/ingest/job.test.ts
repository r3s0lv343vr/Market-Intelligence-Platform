import assert from "node:assert/strict";
import test from "node:test";
import { runScheduledTick } from "./job";
import { seedFixtureCatalog } from "../packs/runtime";

test("serving-plane tick never contacts SEC and does not swap packs", async () => {
  const catalog = seedFixtureCatalog();
  const before = catalog.snapshot().livePackVersion;
  const result = await runScheduledTick({
    catalog,
    now: new Date("2026-08-24T08:30:00.000Z"),
    env: {},
  });
  assert.equal(result.contactedSec, false);
  assert.equal(result.action, "heartbeat-serving-plane");
  assert.equal(result.userImpact, "none");
  assert.equal(catalog.get("NSM")?.packVersion, before);
});

test("worker tick without live SEC still does not call EDGAR", async () => {
  const catalog = seedFixtureCatalog();
  const result = await runScheduledTick({
    catalog,
    now: new Date("2026-08-24T08:30:00.000Z"),
    env: { TRACE_INGEST_HOST_ROLE: "worker" },
  });
  assert.equal(result.contactedSec, false);
  assert.equal(result.action, "published-staging-from-warehouse");
  assert.match(catalog.get("NSM")?.packVersion ?? "", /2026-08-24/);
});

test("second tick the same Eastern day is a no-op", async () => {
  const catalog = seedFixtureCatalog();
  const now = new Date("2026-08-24T08:30:00.000Z");
  const env = { TRACE_INGEST_HOST_ROLE: "worker" };
  await runScheduledTick({ catalog, now, env });
  const version = catalog.get("LATT")?.packVersion;
  const second = await runScheduledTick({ catalog, now, env });
  assert.equal(second.action, "skip-already-published");
  assert.equal(catalog.get("LATT")?.packVersion, version);
});
