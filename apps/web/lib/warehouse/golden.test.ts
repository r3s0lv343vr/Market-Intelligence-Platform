import assert from "node:assert/strict";
import test from "node:test";
import { buildPack } from "../packs/build";
import { packFingerprint } from "../packs/contract";
import { resolveConcept } from "../resolver";
import { silverForCik } from "../silver/facts";

const published = "2026-09-06T00:00:00.000Z";

function pack(ticker: string) {
  const built = buildPack(ticker, "golden", 1, published);
  assert.ok(built);
  return built;
}

test("golden 10-Ks: clean auto, messy software, bank (16 cases)", () => {
  const nsmSilver = silverForCik("0001000001");
  const lattSilver = silverForCik("0001000003");
  const hbtSilver = silverForCik("0001000002");
  const nsm = pack("NSM");
  const latt = pack("LATT");
  const hbt = pack("HBT");

  const cases: { name: string; ok: boolean }[] = [
    { name: "NSM FY2025 revenue is Revenues 176.4B", ok: resolveConcept(nsmSilver, "revenue", "2025-12-31", "annual").value === 176_400_000_000 },
    { name: "NSM FY2025 revenue tag is not SalesRevenueNet", ok: resolveConcept(nsmSilver, "revenue", "2025-12-31", "annual").provenance.tag !== "SalesRevenueNet" },
    { name: "NSM FY2025 revenue is not the Europe segment", ok: resolveConcept(nsmSilver, "revenue", "2025-12-31", "annual").value !== 4_000_000_000 },
    { name: "NSM Q3 is not used as FY", ok: resolveConcept(nsmSilver, "revenue", "2025-12-31", "annual").value !== 41_200_000_000 },
    { name: "NSM YTD is not used as FY", ok: resolveConcept(nsmSilver, "revenue", "2025-12-31", "annual").value !== 128_000_000_000 },
    { name: "NSM gross profit calculated", ok: resolveConcept(nsmSilver, "gross_profit", "2025-12-31", "annual").value === 24_200_000_000 },
    { name: "NSM FCF calculated", ok: resolveConcept(nsmSilver, "fcf", "2025-12-31", "annual").value === 3_200_000_000 },
    { name: "NSM net income", ok: resolveConcept(nsmSilver, "net_income", "2025-12-31", "annual").value === 3_410_000_000 },
    { name: "NSM assets", ok: resolveConcept(nsmSilver, "total_assets", "2025-12-31", "annual").value === 284_000_000_000 },
    { name: "NSM inventory", ok: resolveConcept(nsmSilver, "inventory", "2025-12-31", "annual").value === 21_400_000_000 },
    { name: "NSM FY2024 revenue", ok: resolveConcept(nsmSilver, "revenue", "2024-12-31", "annual").value === 167_400_000_000 },
    { name: "NSM EPS and shares present", ok: resolveConcept(nsmSilver, "eps_diluted", "2025-12-31", "annual").value === 3.12 && resolveConcept(nsmSilver, "shares", "2025-12-31", "annual").value === 1_092_000_000 },
    { name: "HBT revenue unmapped", ok: resolveConcept(hbtSilver, "revenue", "2025-12-31", "annual").value == null },
    { name: "HBT net income observed", ok: resolveConcept(hbtSilver, "net_income", "2025-12-31", "annual").value === 1_640_000_000 },
    { name: "LATT contract revenue", ok: resolveConcept(lattSilver, "revenue", "2026-01-31", "annual").provenance.tag === "RevenueFromContractWithCustomerExcludingAssessedTax" },
    { name: "LATT deferred revenue", ok: resolveConcept(lattSilver, "deferred_revenue", "2026-01-31", "annual").value === 1_880_000_000 },
    { name: "LATT gross profit calculated", ok: resolveConcept(lattSilver, "gross_profit", "2026-01-31", "annual").value === 3_650_000_000 },
    { name: "NSM pack revenue shows accession", ok: nsm.lines.some((l) => l.concept === "revenue" && l.periodEnd === "2025-12-31" && l.provenance.accession === "0001000001-26-000012") },
    { name: "HBT pack does not invent revenue", ok: hbt.lines.some((l) => l.concept === "revenue" && l.value == null) },
    { name: "two readers share one NSM fingerprint", ok: packFingerprint(nsm) === packFingerprint(pack("NSM")) },
  ];

  const failed = cases.filter((c) => !c.ok);
  assert.equal(failed.length, 0, failed.map((c) => c.name).join("; "));
  assert.ok(cases.length >= 16);
  assert.ok(latt.shared && nsm.disclaimer.includes("not a substitute"));
});
