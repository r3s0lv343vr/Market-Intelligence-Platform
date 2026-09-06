import assert from "node:assert/strict";
import test from "node:test";
import { facts } from "../fixtures";
import { parseCompanyFactsJson } from "./companyfacts";
import { factKey, inferDuration, loadSilver, toSilver } from "./facts";

test("silver load is unique by factKey and replay does not duplicate", () => {
  const first = loadSilver();
  const second = loadSilver([...facts, ...facts]);
  assert.equal(first.length, second.length);
  const keys = new Set(first.map((f) => f.factKey));
  assert.equal(keys.size, first.length);
  assert.ok(first.every((f) => f.filedAt && f.unit && f.accession));
});

test("duration inference distinguishes quarter, ytd, and annual", () => {
  assert.equal(inferDuration("2025-07-01", "2025-09-30", "Q3"), "quarter");
  assert.equal(inferDuration("2025-01-01", "2025-09-30", "Q3"), "ytd");
  assert.equal(inferDuration("2025-01-01", "2025-12-31", "FY"), "annual");
  assert.equal(inferDuration(undefined, "2025-12-31", "FY"), "annual");
});

test("companyfacts parser keeps dimensions and does not fetch", () => {
  const rows = parseCompanyFactsJson({
    cik: 1000001,
    facts: {
      "us-gaap": {
        Revenues: {
          units: {
            USD: [
              {
                start: "2025-01-01",
                end: "2025-12-31",
                val: 176_400_000_000,
                accn: "0001000001-26-000012",
                form: "10-K",
                filed: "2026-02-18",
                fp: "FY",
              },
              {
                start: "2025-01-01",
                end: "2025-12-31",
                val: 4_000_000_000,
                accn: "0001000001-26-000012",
                form: "10-K",
                filed: "2026-02-18",
                fp: "FY",
                segments: { axis: "BusinessSegment", member: "Europe" },
              },
            ],
          },
        },
      },
    },
  });
  assert.equal(rows.length, 2);
  const plain = rows.find((r) => r.dimensions === "");
  const dim = rows.find((r) => r.dimensions.includes("Europe"));
  assert.equal(plain?.value, 176_400_000_000);
  assert.equal(plain?.duration, "annual");
  assert.ok(dim);
  assert.notEqual(factKey(plain!), factKey(dim!));
  assert.equal(toSilver(plain!).cik, "0001000001");
});
