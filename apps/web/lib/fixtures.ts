import { companyFromEntity, listEntities } from "./entity/table";
import type { Company, Filing, RawFact } from "./types";

export const MAPPING_VERSION = "corporate-v1";
export const PACK_VERSION = "fixture-2026-08-24";

export const filings: Filing[] = [
  {
    cik: "0001000001",
    accession: "0001000001-26-000012",
    form: "10-K",
    filedAt: "2026-02-18",
    periodEnd: "2025-12-31",
    title: "Annual report — FY2025",
  },
  {
    cik: "0001000001",
    accession: "0001000001-25-000044",
    form: "10-Q",
    filedAt: "2025-11-06",
    periodEnd: "2025-09-30",
    title: "Quarterly report — Q3 2025",
  },
  {
    cik: "0001000001",
    accession: "0001000001-25-000008",
    form: "10-K",
    filedAt: "2025-02-20",
    periodEnd: "2024-12-31",
    title: "Annual report — FY2024",
  },
  {
    cik: "0001000002",
    accession: "0001000002-26-000019",
    form: "10-K",
    filedAt: "2026-02-27",
    periodEnd: "2025-12-31",
    title: "Annual report — FY2025",
  },
  {
    cik: "0001000003",
    accession: "0001000003-26-000021",
    form: "10-K",
    filedAt: "2026-03-12",
    periodEnd: "2026-01-31",
    title: "Annual report — FY2026",
  },
  {
    cik: "0001000003",
    accession: "0001000003-25-000017",
    form: "10-K",
    filedAt: "2025-03-14",
    periodEnd: "2025-01-31",
    title: "Annual report — FY2025",
  },
];

/** Pack universe: entities that have fixture facts (coverage A). */
export const companies: Company[] = listEntities()
  .filter((e) => e.coverageTier === "A")
  .map((e) => companyFromEntity(e, filings));

function fact(
  cik: string,
  tag: string,
  periodEnd: string,
  duration: RawFact["duration"],
  value: number,
  accession: string,
  form: string,
  filedAt: string,
): RawFact {
  return {
    cik,
    taxonomy: "us-gaap",
    tag,
    unit: "USD",
    periodEnd,
    duration,
    value,
    accession,
    form,
    filedAt,
  };
}

export const facts: RawFact[] = [
  // Northstar — dual-tagged revenue, inventory spike
  fact("0001000001", "Revenues", "2025-12-31", "annual", 176_400_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "RevenueFromContractWithCustomerExcludingAssessedTax", "2025-12-31", "annual", 176_400_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "Revenues", "2024-12-31", "annual", 167_400_000_000, "0001000001-25-000008", "10-K", "2025-02-20"),
  fact("0001000001", "CostOfGoodsAndServicesSold", "2025-12-31", "annual", 152_200_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "CostOfGoodsAndServicesSold", "2024-12-31", "annual", 142_800_000_000, "0001000001-25-000008", "10-K", "2025-02-20"),
  fact("0001000001", "OperatingIncomeLoss", "2025-12-31", "annual", 4_920_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "OperatingIncomeLoss", "2024-12-31", "annual", 6_980_000_000, "0001000001-25-000008", "10-K", "2025-02-20"),
  fact("0001000001", "NetIncomeLoss", "2025-12-31", "annual", 3_410_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "NetIncomeLoss", "2024-12-31", "annual", 4_870_000_000, "0001000001-25-000008", "10-K", "2025-02-20"),
  fact("0001000001", "Assets", "2025-12-31", "annual", 284_000_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "Liabilities", "2025-12-31", "annual", 239_600_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "StockholdersEquity", "2025-12-31", "annual", 44_400_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "InventoryNet", "2025-12-31", "annual", 21_400_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "InventoryNet", "2024-12-31", "annual", 18_240_000_000, "0001000001-25-000008", "10-K", "2025-02-20"),
  fact("0001000001", "AccountsReceivableNetCurrent", "2025-12-31", "annual", 15_100_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "AccountsReceivableNetCurrent", "2024-12-31", "annual", 14_200_000_000, "0001000001-25-000008", "10-K", "2025-02-20"),
  fact("0001000001", "LongTermDebt", "2025-12-31", "annual", 96_200_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "CashAndCashEquivalentsAtCarryingValue", "2025-12-31", "annual", 22_800_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "NetCashProvidedByUsedInOperatingActivities", "2025-12-31", "annual", 12_100_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "NetCashProvidedByUsedInOperatingActivities", "2024-12-31", "annual", 13_160_000_000, "0001000001-25-000008", "10-K", "2025-02-20"),
  fact("0001000001", "PaymentsToAcquirePropertyPlantAndEquipment", "2025-12-31", "annual", 8_900_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "InterestExpense", "2025-12-31", "annual", 1_840_000_000, "0001000001-26-000012", "10-K", "2026-02-18"),
  fact("0001000001", "InterestExpense", "2024-12-31", "annual", 1_504_000_000, "0001000001-25-000008", "10-K", "2025-02-20"),
  // Stale tag must not win for 2025
  fact("0001000001", "SalesRevenueNet", "2010-12-31", "annual", 62_500_000_000, "0001000001-11-000003", "10-K", "2011-02-28"),

  // Harbor Trust — no top-line revenue tag (bank template)
  fact("0001000002", "InterestIncomeOperating", "2025-12-31", "annual", 8_420_000_000, "0001000002-26-000019", "10-K", "2026-02-27"),
  fact("0001000002", "NoninterestIncome", "2025-12-31", "annual", 2_110_000_000, "0001000002-26-000019", "10-K", "2026-02-27"),
  fact("0001000002", "NetIncomeLoss", "2025-12-31", "annual", 1_640_000_000, "0001000002-26-000019", "10-K", "2026-02-27"),
  fact("0001000002", "Assets", "2025-12-31", "annual", 118_000_000_000, "0001000002-26-000019", "10-K", "2026-02-27"),
  fact("0001000002", "Liabilities", "2025-12-31", "annual", 106_200_000_000, "0001000002-26-000019", "10-K", "2026-02-27"),
  fact("0001000002", "StockholdersEquity", "2025-12-31", "annual", 11_800_000_000, "0001000002-26-000019", "10-K", "2026-02-27"),

  // Lattice Soft — contract revenue tag only
  fact("0001000003", "RevenueFromContractWithCustomerExcludingAssessedTax", "2026-01-31", "annual", 4_860_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "RevenueFromContractWithCustomerExcludingAssessedTax", "2025-01-31", "annual", 3_920_000_000, "0001000003-25-000017", "10-K", "2025-03-14"),
  fact("0001000003", "CostOfGoodsAndServicesSold", "2026-01-31", "annual", 1_210_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "CostOfGoodsAndServicesSold", "2025-01-31", "annual", 1_050_000_000, "0001000003-25-000017", "10-K", "2025-03-14"),
  fact("0001000003", "OperatingIncomeLoss", "2026-01-31", "annual", 612_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "OperatingIncomeLoss", "2025-01-31", "annual", 388_000_000, "0001000003-25-000017", "10-K", "2025-03-14"),
  fact("0001000003", "NetIncomeLoss", "2026-01-31", "annual", 504_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "NetIncomeLoss", "2025-01-31", "annual", 301_000_000, "0001000003-25-000017", "10-K", "2025-03-14"),
  fact("0001000003", "Assets", "2026-01-31", "annual", 7_440_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "Liabilities", "2026-01-31", "annual", 3_210_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "StockholdersEquity", "2026-01-31", "annual", 4_230_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "ContractWithCustomerLiability", "2026-01-31", "annual", 1_880_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "NetCashProvidedByUsedInOperatingActivities", "2026-01-31", "annual", 1_420_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
  fact("0001000003", "PaymentsToAcquirePropertyPlantAndEquipment", "2026-01-31", "annual", 186_000_000, "0001000003-26-000021", "10-K", "2026-03-12"),
];
