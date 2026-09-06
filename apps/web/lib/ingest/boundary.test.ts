import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..", "..");

const userRoutes = [
  "app/api/search/route.ts",
  "app/api/companies/[ticker]/route.ts",
  "app/api/meta/sources/route.ts",
  "app/api/meta/series/route.ts",
  "app/api/meta/entities/route.ts",
  "app/page.tsx",
  "app/companies/[ticker]/page.tsx",
  "app/admin/page.tsx",
  "lib/warehouse.ts",
];

test("user-facing routes never import the ingest HTTP client", () => {
  for (const rel of userRoutes) {
    const src = readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(src, /ingest\/control-plane|secGet|getJobControlPlane/, rel);
  }
});

test("nightly clock route does not import the SEC fetch client", () => {
  const src = readFileSync(path.join(root, "app/api/cron/ingest/route.ts"), "utf8");
  assert.doesNotMatch(src, /ingest\/control-plane|secGet|ingest\/bulk|worker-night/);
});
