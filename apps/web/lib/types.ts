export type TrustClass = "observed" | "calculated" | "model" | "interpretation";

export type Duration = "quarter" | "ytd" | "annual";

export type Template = "corporate" | "bank";

export type CoverageTier = "A" | "B" | "C";

export type LicenseClass = "us-government-work" | "public-filing" | "restricted-third-party";

export type Company = {
  cik: string;
  ticker: string;
  name: string;
  industry: string;
  template: Template;
  sic: string;
  sicTitle: string;
  coverageTier: CoverageTier;
  fiscalYearEnd: string;
  latestPeriod: string;
  latestForm: string;
  latestFiledAt: string;
};

export type Entity = {
  cik: string;
  ticker: string;
  name: string;
  aliases: string[];
  sic: string;
  sicTitle: string;
  industry: string;
  template: Template;
  coverageTier: CoverageTier;
  fiscalYearEnd: string;
};

export type CompanySearchHit = {
  ticker: string;
  name: string;
  cik: string;
  industry: string;
  template: Template;
  sic: string;
  coverageTier: CoverageTier;
  hasPack: boolean;
  latestForm: string | null;
  latestPeriod: string | null;
};

export type SeriesFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annual";

export type MacroSeries = {
  seriesId: string;
  officialId: string;
  sourceId: string;
  agency: string;
  label: string;
  unit: string;
  frequency: SeriesFrequency;
  copyrightClass: string;
  citation: string;
  officialUrl: string;
  plausibleFor: string[];
  fixture: {
    latestDisplay: string;
    numeric: number | null;
    asOf: string;
    note: string;
  };
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

/** Silver fact: bronze parsed once. Replay uses factKey; never refetch to “fix.” */
export type SilverFact = RawFact & {
  dimensions: string;
  factKey: string;
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
  licenseClass: LicenseClass;
  attribution: string;
  officialHome: string;
  keyEnv: string | null;
  dailyQueryBudget: string;
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
  shared: true;
  disclaimer: string;
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
