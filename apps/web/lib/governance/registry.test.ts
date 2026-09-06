import assert from "node:assert/strict";
import test from "node:test";
import { GOVERNED_SOURCE_IDS, isFredRegistered, listGovernedSources } from "./registry";
import { CURATED_DRIVER_IDS } from "./drivers";
import { getSeries, listSeries } from "./series";

test("registry covers the MVP agencies and is not a FRED mirror", () => {
  const sources = listGovernedSources();
  const ids = sources.map((s) => s.id);
  for (const id of GOVERNED_SOURCE_IDS) {
    assert.ok(ids.includes(id), `missing source ${id}`);
  }
  assert.equal(isFredRegistered(), false);
  for (const source of sources) {
    assert.ok(source.attribution.length > 0, source.id);
    assert.ok(source.license.length > 0, source.id);
    assert.ok(source.updateCalendar.length > 0, source.id);
    assert.ok(source.officialHome.startsWith("https://"), source.id);
    assert.notEqual(source.licenseClass, "restricted-third-party", source.id);
    assert.match(JSON.stringify(source).toLowerCase(), /not a fred|not called|fixture|identity/, source.id);
  }
});

test("curated series catalog has at least 30 official-agency series", () => {
  const series = listSeries();
  assert.ok(series.length >= 30, `expected >= 30 series, got ${series.length}`);
  const ids = new Set(series.map((s) => s.seriesId));
  assert.equal(ids.size, series.length);
  const sources = new Set(series.map((s) => s.sourceId));
  for (const needed of ["bls", "bea", "eia", "census", "fed", "nyfed", "treasury"]) {
    assert.ok(sources.has(needed), `catalog missing agency ${needed}`);
  }
  for (const row of series) {
    assert.ok(row.officialId.length > 0, row.seriesId);
    assert.ok(row.citation.length > 0, row.seriesId);
    assert.ok(row.officialUrl.startsWith("https://"), row.seriesId);
    assert.ok(row.plausibleFor.length > 0, row.seriesId);
    assert.doesNotMatch(row.officialId, /^FRED/i, row.seriesId);
    assert.notEqual(row.sourceId, "fred", row.seriesId);
    assert.doesNotMatch(row.agency, /FRED/i, row.seriesId);
    assert.match(row.fixture.note, /[Ff]ixture/, row.seriesId);
  }
});

test("sector drivers resolve from the series catalog, not an ad-hoc dump", () => {
  for (const [industry, ids] of Object.entries(CURATED_DRIVER_IDS)) {
    assert.ok(ids.length >= 3 && ids.length <= 6, industry);
    for (const id of ids) {
      assert.ok(getSeries(id), `${industry} driver ${id} missing from catalog`);
    }
  }
});
