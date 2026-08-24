export function money(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function pct(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

export function trustLabel(trust: string) {
  switch (trust) {
    case "observed":
      return "Observed";
    case "calculated":
      return "Calculated";
    case "model":
      return "Model";
    default:
      return "Interpretation";
  }
}
