import type { Driver } from "../types";
import { getSeries } from "./series";

/**
 * Curated sector driver lists — not a dump of the thirty-series catalog.
 * Each id must exist in SERIES_CATALOG. 2s10s is calculated from Treasury 2y and 10y.
 */
export const CURATED_DRIVER_IDS: Record<string, string[]> = {
  "Automobile manufacturing": [
    "nyfed-auto-rate",
    "bls-ahe-mfg",
    "eia-wti",
    "census-marts-auto",
    "treas-yc-10y",
  ],
  "Regional bank": ["treas-yc-2y", "treas-yc-10y", "fed-ffr", "nyfed-sofr", "treas-debt-penny"],
  "Application software": ["bea-pfi-software", "bea-rpce", "bls-cpi-u-all", "census-qss-info"],
};

function driverFromSeries(seriesId: string, extra?: Partial<Driver>): Driver {
  const series = getSeries(seriesId);
  if (!series) {
    throw new Error(`Curated driver ${seriesId} is not in the series catalog`);
  }
  return {
    seriesId: series.seriesId,
    label: series.label,
    source: `${series.agency} / fixture`,
    latest: series.fixture.latestDisplay,
    asOf: series.fixture.asOf,
    plausibleFor: series.plausibleFor.join("; "),
    note: series.fixture.note,
    copyrightClass: series.copyrightClass,
    ...extra,
  };
}

function twoTenSpread(): Driver {
  const two = getSeries("treas-yc-2y");
  const ten = getSeries("treas-yc-10y");
  if (!two || !ten || two.fixture.numeric == null || ten.fixture.numeric == null) {
    throw new Error("2s10s requires fixture numerics on Treasury 2y and 10y");
  }
  const spread = ten.fixture.numeric - two.fixture.numeric;
  return {
    seriesId: "treas-2s10s",
    label: "2s10s Treasury par-yield spread",
    source: "Treasury / calculated from fixtures",
    latest: `${spread.toFixed(2)} pp`,
    asOf: ten.fixture.asOf,
    plausibleFor: "Net interest margin",
    note: "Calculated from Treasury 2-year and 10-year par yields. Bank template required — do not invent a revenue line.",
    copyrightClass: "U.S. government work: citation required",
  };
}

export function driversForIndustry(industry: string): Driver[] {
  const ids = CURATED_DRIVER_IDS[industry] ?? [];
  const drivers = ids.map((id) => driverFromSeries(id));
  if (industry === "Regional bank") {
    drivers.splice(2, 0, twoTenSpread());
  }
  if (industry === "Automobile manufacturing") {
    const auto = drivers.find((d) => d.seriesId === "nyfed-auto-rate");
    if (auto) {
      auto.plausibleFor = "Vehicle affordability and demand";
      auto.note = "Economically plausible driver — not a causal claim. Fixture series.";
    }
    const wages = drivers.find((d) => d.seriesId === "bls-ahe-mfg");
    if (wages) {
      wages.plausibleFor = "Labor cost → operating expense";
    }
  }
  if (industry === "Application software") {
    const software = drivers.find((d) => d.seriesId === "bea-pfi-software");
    if (software) {
      software.plausibleFor = "Enterprise demand backdrop";
      software.note = "Plausible overlay, not a company forecast. Live BEA ingest is not enabled.";
    }
  }
  return drivers;
}
