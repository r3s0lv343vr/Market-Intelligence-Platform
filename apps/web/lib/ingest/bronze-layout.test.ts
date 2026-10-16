import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bronzeRoot } from "./bronze";
import { pruneOldDatasetZips } from "./bronze-layout";

test("prune keeps the newest two dated zip days and never deletes live", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-prune-"));
  const root = path.join(bronzeRoot(dir), "sec", "companyfacts");
  for (const name of ["live", "2026-08-20", "2026-08-21", "2026-08-22"]) {
    mkdirSync(path.join(root, name), { recursive: true });
    writeFileSync(path.join(root, name, "keep.txt"), name);
  }
  const result = pruneOldDatasetZips(dir, "companyfacts", 2);
  assert.deepEqual(result.deleted, ["2026-08-20"]);
  assert.equal(existsSync(path.join(root, "2026-08-20")), false);
  assert.equal(existsSync(path.join(root, "live", "keep.txt")), true);
  assert.equal(existsSync(path.join(root, "2026-08-21")), true);
  assert.equal(existsSync(path.join(root, "2026-08-22")), true);
});
