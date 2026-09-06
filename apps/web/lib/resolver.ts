import { MAPPING_VERSION } from "./fixtures";
import type { Duration, RawFact, StatementLine, TrustClass } from "./types";

export type ConceptDef = {
  concept: string;
  label: string;
  tags: string[];
  unit?: string;
  calculatedFrom?: [string, string];
  calc: "subtract" | null;
};

export const CONCEPTS: ConceptDef[] = [
  { concept: "revenue", label: "Revenue", tags: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"], calc: null },
  { concept: "cogs", label: "Cost of sales", tags: ["CostOfGoodsAndServicesSold"], calc: null },
  { concept: "gross_profit", label: "Gross profit", tags: [], calculatedFrom: ["revenue", "cogs"], calc: "subtract" },
  { concept: "rd", label: "Research and development", tags: ["ResearchAndDevelopmentExpense"], calc: null },
  { concept: "sga", label: "Selling, general and administrative", tags: ["SellingGeneralAndAdministrativeExpense"], calc: null },
  { concept: "operating_income", label: "Operating income", tags: ["OperatingIncomeLoss"], calc: null },
  { concept: "interest_expense", label: "Interest expense", tags: ["InterestExpense"], calc: null },
  { concept: "tax", label: "Income tax", tags: ["IncomeTaxExpenseBenefit"], calc: null },
  { concept: "net_income", label: "Net income", tags: ["NetIncomeLoss"], calc: null },
  { concept: "eps_diluted", label: "Diluted EPS", tags: ["EarningsPerShareDiluted"], unit: "USD/shares", calc: null },
  { concept: "total_assets", label: "Total assets", tags: ["Assets"], calc: null },
  { concept: "current_assets", label: "Current assets", tags: ["AssetsCurrent"], calc: null },
  { concept: "total_liabilities", label: "Total liabilities", tags: ["Liabilities"], calc: null },
  { concept: "current_liabilities", label: "Current liabilities", tags: ["LiabilitiesCurrent"], calc: null },
  { concept: "equity", label: "Equity", tags: ["StockholdersEquity"], calc: null },
  { concept: "inventory", label: "Inventory", tags: ["InventoryNet"], calc: null },
  { concept: "receivables", label: "Receivables", tags: ["AccountsReceivableNetCurrent"], calc: null },
  { concept: "payables", label: "Accounts payable", tags: ["AccountsPayableCurrent"], calc: null },
  { concept: "cash", label: "Cash", tags: ["CashAndCashEquivalentsAtCarryingValue"], calc: null },
  { concept: "long_term_debt", label: "Long-term debt", tags: ["LongTermDebt"], calc: null },
  { concept: "cfo", label: "Operating cash flow", tags: ["NetCashProvidedByUsedInOperatingActivities"], calc: null },
  { concept: "capex", label: "Capex", tags: ["PaymentsToAcquirePropertyPlantAndEquipment"], calc: null },
  { concept: "fcf", label: "Free cash flow", tags: [], calculatedFrom: ["cfo", "capex"], calc: "subtract" },
  { concept: "deferred_revenue", label: "Deferred revenue", tags: ["ContractWithCustomerLiability"], calc: null },
  { concept: "goodwill", label: "Goodwill", tags: ["Goodwill"], calc: null },
  { concept: "dividends", label: "Dividends paid", tags: ["PaymentsOfDividends"], calc: null },
  { concept: "shares", label: "Shares outstanding", tags: ["CommonStockSharesOutstanding"], unit: "shares", calc: null },
];

function unmapped(def: ConceptDef, periodEnd: string, duration: Duration): StatementLine {
  return {
    concept: def.concept,
    label: def.label,
    value: null,
    unit: def.unit ?? "USD",
    periodEnd,
    duration,
    trust: "observed",
    gap:
      def.concept === "revenue"
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

function fromFact(def: ConceptDef, winner: RawFact, confidence: number): StatementLine {
  return {
    concept: def.concept,
    label: def.label,
    value: winner.value,
    unit: winner.unit,
    periodEnd: winner.periodEnd,
    duration: winner.duration,
    trust: "observed",
    provenance: {
      tag: winner.tag,
      accession: winner.accession,
      form: winner.form,
      filedAt: winner.filedAt,
      mappingVersion: MAPPING_VERSION,
      confidence,
      direct: true,
    },
  };
}

export function resolveConcept(
  facts: RawFact[],
  concept: string,
  periodEnd: string,
  duration: Duration,
  seen: Set<string> = new Set(),
): StatementLine {
  const def = CONCEPTS.find((c) => c.concept === concept);
  if (!def) {
    throw new Error(`Unknown concept ${concept}`);
  }

  if (def.calculatedFrom && def.calc === "subtract") {
    if (seen.has(concept)) return unmapped(def, periodEnd, duration);
    const next = new Set(seen).add(concept);
    const left = resolveConcept(facts, def.calculatedFrom[0], periodEnd, duration, next);
    const right = resolveConcept(facts, def.calculatedFrom[1], periodEnd, duration, next);
    if (left.value == null || right.value == null) {
      return unmapped(def, periodEnd, duration);
    }
    return {
      concept: def.concept,
      label: def.label,
      value: left.value - right.value,
      unit: left.unit,
      periodEnd,
      duration,
      trust: "calculated" satisfies TrustClass,
      provenance: {
        tag: `${left.provenance.tag} − ${right.provenance.tag}`,
        accession: left.provenance.accession,
        form: left.provenance.form,
        filedAt: left.provenance.filedAt,
        mappingVersion: MAPPING_VERSION,
        confidence: Math.min(left.provenance.confidence, right.provenance.confidence),
        direct: false,
      },
    };
  }

  const undimensioned = facts.filter((f) => !f.dimensions);
  const pool = undimensioned.length ? undimensioned : facts;

  const candidates = def.tags
    .map((tag) =>
      pool.find((f) => f.tag === tag && f.periodEnd === periodEnd && f.duration === duration),
    )
    .filter((f): f is RawFact => Boolean(f));

  const uniqueValues = [...new Set(candidates.map((c) => c.value))];
  const winner = candidates[0];
  if (!winner) return unmapped(def, periodEnd, duration);
  return fromFact(def, winner, uniqueValues.length > 1 ? 0.7 : 0.95);
}

export function resolveStatement(facts: RawFact[], periodEnd: string, duration: Duration): StatementLine[] {
  return CONCEPTS.map((c) => resolveConcept(facts, c.concept, periodEnd, duration));
}

export function identityResidual(lines: StatementLine[]): number | null {
  const assets = lines.find((l) => l.concept === "total_assets")?.value;
  const liab = lines.find((l) => l.concept === "total_liabilities")?.value;
  const equity = lines.find((l) => l.concept === "equity")?.value;
  if (assets == null || liab == null || equity == null) return null;
  return assets - (liab + equity);
}
