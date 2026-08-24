import assert from "node:assert/strict";
import test from "node:test";
import { seedFixtureCatalog, rebuildFromWarehouse } from "./runtime";

test("readers keep the live pack while staging is being built", async () => {
  const catalog = seedFixtureCatalog();
  const before = catalog.get("NSM");
  assert.ok(before);

  let seenDuringIngest: string | undefined;
  const job = rebuildFromWarehouse(catalog, "fixture-next", new Date("2026-08-24T12:00:00.000Z"), async () => {
    const mid = catalog.get("NSM");
    assert.ok(mid);
    seenDuringIngest = mid.packVersion;
    assert.equal(mid.packVersion, before.packVersion);
    assert.equal(catalog.snapshot().ingestRunning, true);
  });

  await job;
  const after = catalog.get("NSM");
  assert.ok(after);
  assert.equal(seenDuringIngest, before.packVersion);
  assert.equal(after.packVersion, "fixture-next");
  assert.notEqual(after.generation, before.generation);
  assert.equal(catalog.snapshot().ingestRunning, false);
});

test("a failed staging publish leaves the live pack in place", () => {
  const catalog = seedFixtureCatalog();
  const before = catalog.get("HBT");
  assert.ok(before);
  catalog.beginStaging("broken");
  catalog.abandonStaging();
  const after = catalog.get("HBT");
  assert.ok(after);
  assert.equal(after.packVersion, before.packVersion);
  assert.equal(after.generation, before.generation);
});
