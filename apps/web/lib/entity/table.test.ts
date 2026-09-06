import assert from "node:assert/strict";
import test from "node:test";
import { companies, filings } from "../fixtures";
import { resolveConcept } from "../resolver";
import { facts } from "../fixtures";
import {
  assertEntityKeysUnique,
  companyFromEntity,
  getEntityByTicker,
  listEntities,
  searchEntities,
} from "./table";

test("entity keys are unique and demo names are tier A with official SIC", () => {
  assertEntityKeysUnique();
  const nsm = getEntityByTicker("NSM");
  const hbt = getEntityByTicker("HBT");
  const latt = getEntityByTicker("LATT");
  assert.ok(nsm && hbt && latt);
  assert.equal(nsm.coverageTier, "A");
  assert.equal(hbt.coverageTier, "A");
  assert.equal(latt.coverageTier, "A");
  assert.equal(nsm.sic, "3711");
  assert.equal(hbt.sic, "6022");
  assert.equal(latt.sic, "7372");
  assert.equal(hbt.template, "bank");
  assert.equal(nsm.template, "corporate");
  const tiers = new Set(listEntities().map((e) => e.coverageTier));
  assert.ok(tiers.has("A") && tiers.has("B") && tiers.has("C"));
});

test("search hits ticker, alias, SIC, and CIK", () => {
  const packTickers = new Set(companies.map((c) => c.ticker));
  const byAlias = searchEntities("North Star", filings, packTickers);
  assert.equal(byAlias.some((h) => h.ticker === "NSM"), true);
  const bySic = searchEntities("6022", filings, packTickers);
  assert.equal(bySic.some((h) => h.ticker === "HBT"), true);
  const byCik = searchEntities("0001000003", filings, packTickers);
  assert.equal(byCik[0]?.ticker, "LATT");
  const fund = searchEntities("HLFX", filings, packTickers);
  assert.equal(fund[0]?.hasPack, false);
  assert.equal(fund[0]?.coverageTier, "C");
});

test("pack companies stay the tier-A fact universe; banks stay unmapped", () => {
  assert.deepEqual(
    companies.map((c) => c.ticker).sort(),
    ["HBT", "LATT", "NSM"],
  );
  const hbt = getEntityByTicker("HBT");
  assert.ok(hbt);
  const company = companyFromEntity(hbt, filings);
  assert.equal(company.template, "bank");
  const line = resolveConcept(
    facts.filter((f) => f.cik === hbt.cik),
    "revenue",
    "2025-12-31",
    "annual",
  );
  assert.equal(line.value, null);
  assert.match(line.gap ?? "", /unmapped/);
});
