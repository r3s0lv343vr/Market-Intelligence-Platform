import assert from "node:assert/strict";
import test from "node:test";
import { facts } from "./fixtures";
import { CONCEPTS, identityResidual, resolveConcept, resolveStatement } from "./resolver";
import { silverForCik } from "./silver/facts";

test("period-scoped tag wins over stale SalesRevenueNet", () => {
  const nsm = silverForCik("0001000001");
  const line = resolveConcept(nsm, "revenue", "2025-12-31", "annual");
  assert.equal(line.value, 176_400_000_000);
  assert.equal(line.provenance.tag, "Revenues");
  assert.notEqual(line.provenance.tag, "SalesRevenueNet");
});

test("annual resolution ignores quarter, ytd, and dimensioned segment facts", () => {
  const nsm = silverForCik("0001000001");
  const annual = resolveConcept(nsm, "revenue", "2025-12-31", "annual");
  const quarter = resolveConcept(nsm, "revenue", "2025-09-30", "quarter");
  const ytd = resolveConcept(nsm, "revenue", "2025-09-30", "ytd");
  assert.equal(annual.value, 176_400_000_000);
  assert.equal(quarter.value, 41_200_000_000);
  assert.equal(ytd.value, 128_000_000_000);
  assert.notEqual(annual.value, 4_000_000_000);
});

test("bank has no invented revenue", () => {
  const bank = facts.filter((f) => f.cik === "0001000002");
  const line = resolveConcept(bank, "revenue", "2025-12-31", "annual");
  assert.equal(line.value, null);
  assert.match(line.gap ?? "", /unmapped/);
});

test("software contract-revenue tag resolves", () => {
  const soft = facts.filter((f) => f.cik === "0001000003");
  const line = resolveConcept(soft, "revenue", "2026-01-31", "annual");
  assert.equal(line.value, 4_860_000_000);
  assert.equal(line.provenance.tag, "RevenueFromContractWithCustomerExcludingAssessedTax");
});

test("gross profit and FCF are calculated, never observed", () => {
  const nsm = silverForCik("0001000001");
  const gp = resolveConcept(nsm, "gross_profit", "2025-12-31", "annual");
  const fcf = resolveConcept(nsm, "fcf", "2025-12-31", "annual");
  assert.equal(gp.value, 24_200_000_000);
  assert.equal(gp.trust, "calculated");
  assert.equal(gp.provenance.direct, false);
  assert.equal(fcf.value, 3_200_000_000);
  assert.equal(fcf.trust, "calculated");
});

test("resolver covers at least 20 corporate line items", () => {
  assert.ok(CONCEPTS.length >= 20);
  const nsm = resolveStatement(silverForCik("0001000001"), "2025-12-31", "annual");
  assert.equal(nsm.length, CONCEPTS.length);
  assert.equal(identityResidual(nsm), 0);
});
