import { MAPPING_VERSION } from "./fixtures";
import type { Duration, RawFact, StatementLine } from "./types";

export const CONCEPTS: { concept: string; label: string; tags: string[] }[] = [
  { concept: "revenue", label: "Revenue", tags: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"] },
  { concept: "cogs", label: "Cost of sales", tags: ["CostOfGoodsAndServicesSold"] },
  { concept: "operating_income", label: "Operating income", tags: ["OperatingIncomeLoss"] },
  { concept: "net_income", label: "Net income", tags: ["NetIncomeLoss"] },
  { concept: "total_assets", label: "Total assets", tags: ["Assets"] },
  { concept: "total_liabilities", label: "Total liabilities", tags: ["Liabilities"] },
  { concept: "equity", label: "Equity", tags: ["StockholdersEquity"] },
  { concept: "inventory", label: "Inventory", tags: ["InventoryNet"] },
  { concept: "receivables", label: "Receivables", tags: ["AccountsReceivableNetCurrent"] },
  { concept: "long_term_debt", label: "Long-term debt", tags: ["LongTermDebt"] },
  { concept: "cash", label: "Cash", tags: ["CashAndCashEquivalentsAtCarryingValue"] },
  { concept: "cfo", label: "Operating cash flow", tags: ["NetCashProvidedByUsedInOperatingActivities"] },
  { concept: "capex", label: "Capex", tags: ["PaymentsToAcquirePropertyPlantAndEquipment"] },
  { concept: "interest_expense", label: "Interest expense", tags: ["InterestExpense"] },
  { concept: "deferred_revenue", label: "Deferred revenue", tags: ["ContractWithCustomerLiability"] },
];

export function resolveConcept(
  facts: RawFact[],
  concept: string,
  periodEnd: string,
  duration: Duration,
): StatementLine {
  const def = CONCEPTS.find((c) => c.concept === concept);
  if (!def) {
    throw new Error(`Unknown concept ${concept}`);
  }

  const candidates = def.tags
    .map((tag) =>
      facts.find(
        (f) => f.tag === tag && f.periodEnd === periodEnd && f.duration === duration,
      ),
    )
    .filter((f): f is RawFact => Boolean(f));

  const uniqueValues = [...new Set(candidates.map((c) => c.value))];
  const winner = candidates[0];

  if (!winner) {
    return {
      concept,
      label: def.label,
      value: null,
      unit: "USD",
      periodEnd,
      duration,
      trust: "observed",
      gap:
        concept === "revenue"
          ? "unmapped — no period-scoped revenue tag (bank template required if this is a bank)"
          : "unmapped",
      provenance: {
        tag: null,
        accession: null,
        form: null,
        filedAt: null,
        mappingVersion: MAPPING_VERSION,
        confidence: 0,
        direct: false,
      },
    };
  }

  return {
    concept,
    label: def.label,
    value: winner.value,
    unit: winner.unit,
    periodEnd,
    duration,
    trust: "observed",
    provenance: {
      tag: winner.tag,
      accession: winner.accession,
      form: winner.form,
      filedAt: winner.filedAt,
      mappingVersion: MAPPING_VERSION,
      confidence: uniqueValues.length > 1 ? 0.7 : 0.95,
      direct: true,
    },
  };
}

export function identityResidual(lines: StatementLine[]): number | null {
  const assets = lines.find((l) => l.concept === "total_assets")?.value;
  const liab = lines.find((l) => l.concept === "total_liabilities")?.value;
  const equity = lines.find((l) => l.concept === "equity")?.value;
  if (assets == null || liab == null || equity == null) return null;
  return assets - (liab + equity);
}
