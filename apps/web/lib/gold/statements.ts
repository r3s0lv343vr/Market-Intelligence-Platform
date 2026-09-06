import { silverForCik } from "../silver/facts";
import { resolveStatement } from "../resolver";
import type { Duration, StatementLine } from "../types";

export function goldLinesForCik(cik: string): StatementLine[] {
  const silver = silverForCik(cik);
  const keys = [...new Set(silver.map((f) => `${f.periodEnd}|${f.duration}`))];
  return keys.flatMap((key) => {
    const [periodEnd, duration] = key.split("|") as [string, Duration];
    return resolveStatement(silver, periodEnd, duration);
  });
}

export function annualGold(cik: string): StatementLine[] {
  return goldLinesForCik(cik).filter((l) => l.duration === "annual");
}
