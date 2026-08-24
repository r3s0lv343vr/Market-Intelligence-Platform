export type TrustClass = "observed" | "calculated" | "model" | "interpretation";

export type Duration = "quarter" | "ytd" | "annual";

export type Template = "corporate" | "bank";

export type Company = {
  cik: string;
  ticker: string;
  name: string;
  industry: string;
  template: Template;
  fiscalYearEnd: string;
  latestPeriod: string;
  latestForm: string;
  latestFiledAt: string;
};

export type RawFact = {
  cik: string;
  taxonomy: string;
  tag: string;
  unit: string;
  periodEnd: string;
  duration: Duration;
  value: number;
  accession: string;
  form: string;
  filedAt: string;
  dimensions?: string;
};

export type Filing = {
  cik: string;
  accession: string;
  form: string;
  filedAt: string;
  periodEnd: string;
  title: string;
};

export type StatementLine = {
  concept: string;
  label: string;
  value: number | null;
  unit: string;
  periodEnd: string;
  duration: Duration;
  trust: TrustClass;
  gap?: string;
  provenance: {
    tag: string | null;
    accession: string | null;
    form: string | null;
    filedAt: string | null;
    mappingVersion: string;
    confidence: number;
    direct: boolean;
  };
};

export type Signal = {
  id: string;
  polarity: "positive" | "negative" | "watch";
  title: string;
  summary: string;
  trust: TrustClass;
  inspect: string;
  evidence: {
    formula: string;
    inputs: { label: string; value: string }[];
  };
};

export type Driver = {
  seriesId: string;
  label: string;
  source: string;
  latest: string;
  asOf: string;
  plausibleFor: string;
  note: string;
  copyrightClass: string;
};

export type SourceRecord = {
  id: string;
  name: string;
  role: string;
  license: string;
  updateCalendar: string;
  lastSuccess: string;
  status: "fixture" | "live";
  requestsToday: number;
  budgetNote: string;
};

export type CompanyPack = {
  company: Company;
  packVersion: string;
  mappingVersion: string;
  generation: number;
  publishedAt: string;
  signals: Signal[];
  lines: StatementLine[];
  filings: Filing[];
  peers: {
    ticker: string;
    name: string;
    revenueGrowth: number | null;
    inventoryGrowth: number | null;
    marginChangePp: number | null;
  }[];
  drivers: Driver[];
};
