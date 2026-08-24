import assert from "node:assert/strict";
import test from "node:test";
import { facts } from "./fixtures";
import { resolveConcept } from "./resolver";

test("period-scoped tag wins over stale SalesRevenueNet", () => {
  const nsm = facts.filter((f) => f.cik === "0001000001");
  const line = resolveConcept(nsm, "revenue", "2025-12-31", "annual");
  assert.equal(line.value, 176_400_000_000);
  assert.equal(line.provenance.tag, "Revenues");
  assert.notEqual(line.provenance.tag, "SalesRevenueNet");
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
