import assert from "node:assert/strict";
import test from "node:test";
import { buildPack } from "./build";
import { assertPackContract, packFingerprint } from "./contract";

test("built packs satisfy the shared contract", () => {
  const a = buildPack("NSM", "fixture-2026-09-06", 1, "2026-09-06T00:00:00.000Z");
  const b = buildPack("NSM", "fixture-2026-09-06", 1, "2026-09-06T00:00:00.000Z");
  assert.ok(a && b);
  assertPackContract(a);
  assert.equal(a.shared, true);
  assert.equal(packFingerprint(a), packFingerprint(b));
});
