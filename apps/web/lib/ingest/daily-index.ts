export type MasterIdxRow = {
  cik: string;
  name: string;
  form: string;
  filedAt: string;
  filename: string;
  accession: string;
};

export function secQuarter(month: number): 1 | 2 | 3 | 4 {
  return (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4;
}

export function masterIdxUrl(date: Date, timeZone = "America/New_York"): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const year = parts.year;
  const month = Number(parts.month);
  const yyyymmdd = `${parts.year}${parts.month}${parts.day}`;
  return `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${secQuarter(month)}/master.${yyyymmdd}.idx`;
}

export function accessionFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{10}-\d{2}-\d{6})/);
  return match?.[1] ?? null;
}

/** Parse an EDGAR master.idx body. Does not fetch filings. */
export function parseMasterIdx(text: string): MasterIdxRow[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith("CIK|") || l.includes("CIK|Company Name|Form Type"));
  const rows: MasterIdxRow[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line || line.startsWith("-")) continue;
    const cols = line.split("|");
    if (cols.length < 5) continue;
    const [cik, name, form, filedAt, filename] = cols;
    const accession = accessionFromFilename(filename);
    if (!accession) continue;
    rows.push({
      cik: cik.padStart(10, "0"),
      name,
      form,
      filedAt,
      filename,
      accession,
    });
  }
  return rows;
}

export function diffAccessions(index: MasterIdxRow[], known: Iterable<string>) {
  const have = new Set(known);
  const missing = index.filter((row) => !have.has(row.accession));
  return {
    indexed: index.length,
    known: have.size,
    missingCount: missing.length,
    missingSample: missing.slice(0, 20).map((r) => ({
      accession: r.accession,
      form: r.form,
      cik: r.cik,
    })),
  };
}
