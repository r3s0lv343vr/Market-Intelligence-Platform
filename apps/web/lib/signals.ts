import type { Company, Signal, StatementLine } from "./types";

function line(lines: StatementLine[], concept: string, periodEnd: string) {
  return lines.find((l) => l.concept === concept && l.periodEnd === periodEnd);
}

function pct(curr: number, prev: number) {
  if (!prev) return null;
  return (curr - prev) / prev;
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function pp(n: number) {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)} pp`;
}

export function buildSignals(company: Company, lines: StatementLine[]): Signal[] {
  if (company.template === "bank") {
    return [
      {
        id: "bank-template",
        polarity: "watch",
        title: "Bank template required",
        summary:
          "No period-scoped revenue tag. A generic corporate “revenue” line would be an invention.",
        trust: "interpretation",
        inspect: "Use NII / noninterest income when the bank template ships. Do not zero-fill.",
        evidence: {
          formula: "revenue tag set ∩ period = ∅",
          inputs: [{ label: "Template", value: company.template }],
        },
      },
    ];
  }

  const periods = [...new Set(lines.map((l) => l.periodEnd))].sort();
  const latest = company.latestPeriod;
  const prior = periods.filter((p) => p < latest).at(-1);
  if (!prior) return [];

  const rev = line(lines, "revenue", latest)?.value;
  const revP = line(lines, "revenue", prior)?.value;
  const inv = line(lines, "inventory", latest)?.value;
  const invP = line(lines, "inventory", prior)?.value;
  const op = line(lines, "operating_income", latest)?.value;
  const opP = line(lines, "operating_income", prior)?.value;
  const cfo = line(lines, "cfo", latest)?.value;
  const cfoP = line(lines, "cfo", prior)?.value;
  const intx = line(lines, "interest_expense", latest)?.value;
  const intP = line(lines, "interest_expense", prior)?.value;

  const signals: Signal[] = [];

  const revG = rev != null && revP != null ? pct(rev, revP) : null;
  const invG = inv != null && invP != null ? pct(inv, invP) : null;
  const opM = rev && op != null ? op / rev : null;
  const opMP = revP && opP != null ? opP / revP : null;
  const cfoG = cfo != null && cfoP != null ? pct(cfo, cfoP) : null;
  const intG = intx != null && intP != null ? pct(intx, intP) : null;

  if (revG != null && revG > 0) {
    signals.push({
      id: "rev-up",
      polarity: "positive",
      title: "Revenue increased",
      summary: `Revenue ${usd(rev!)} vs prior year (${(revG * 100).toFixed(1)}%).`,
      trust: "calculated",
      inspect: "Compare to peers and demand drivers.",
      evidence: {
        formula: "(revenue_t − revenue_t-1) / revenue_t-1",
        inputs: [
          { label: `Revenue ${latest}`, value: usd(rev!) },
          { label: `Revenue ${prior}`, value: usd(revP!) },
        ],
      },
    });
  }

  if (opM != null && opMP != null && opM - opMP < -0.005) {
    signals.push({
      id: "margin-down",
      polarity: "negative",
      title: "Operating margin deterioration",
      summary: `Operating margin ${pp(opM - opMP)} versus the prior year.`,
      trust: "calculated",
      inspect: "Wages, input costs, and mix — see drivers.",
      evidence: {
        formula: "op_income/revenue − prior",
        inputs: [
          { label: "Current margin", value: `${(opM * 100).toFixed(1)}%` },
          { label: "Prior margin", value: `${(opMP * 100).toFixed(1)}%` },
        ],
      },
    });
  }

  if (revG != null && invG != null && invG > revG * 2 && invG > 0.05) {
    signals.push({
      id: "inventory-div",
      polarity: "watch",
      title: "Inventory growing faster than revenue",
      summary: `Inventory ${(invG * 100).toFixed(1)}% vs revenue ${(revG * 100).toFixed(1)}%.`,
      trust: "calculated",
      inspect: "Channel inventory, demand, and MD&A language.",
      evidence: {
        formula: "inventory growth > 2 × revenue growth",
        inputs: [
          { label: "Inventory growth", value: `${(invG * 100).toFixed(1)}%` },
          { label: "Revenue growth", value: `${(revG * 100).toFixed(1)}%` },
        ],
      },
    });
  }

  if (cfoG != null && cfoG < 0) {
    signals.push({
      id: "cfo-down",
      polarity: "negative",
      title: "Operating cash flow declined",
      summary: `CFO ${(cfoG * 100).toFixed(1)}% year over year.`,
      trust: "calculated",
      inspect: "Working capital and cash conversion versus earnings.",
      evidence: {
        formula: "(cfo_t − cfo_t-1) / cfo_t-1",
        inputs: [
          { label: `CFO ${latest}`, value: usd(cfo!) },
          { label: `CFO ${prior}`, value: usd(cfoP!) },
        ],
      },
    });
  }

  if (intG != null && intG > 0.15) {
    signals.push({
      id: "interest-up",
      polarity: "watch",
      title: "Interest expense increased",
      summary: `Interest expense ${(intG * 100).toFixed(1)}% versus prior year.`,
      trust: "calculated",
      inspect: "Rates and refinancing — see yield-curve / auto-credit drivers.",
      evidence: {
        formula: "(interest_t − interest_t-1) / interest_t-1",
        inputs: [
          { label: `Interest ${latest}`, value: usd(intx!) },
          { label: `Interest ${prior}`, value: usd(intP!) },
        ],
      },
    });
  }

  return signals;
}
