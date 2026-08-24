import {
  AGENT_TOKEN,
  INGEST_CONFIRM_ENV,
  INGEST_ENABLE_ENV,
  SEC_HARD_CAP_RPS,
  SEC_TARGET_RPS,
} from "../identity";

export class IngestBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestBlockedError";
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

export class HostNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostNotAllowedError";
  }
}

/** Nightly bulk payloads — one zip is thousands of companies. Per-CIK JSON is not a first pull. */
export const SEC_BULK_URLS = {
  companyfacts: "https://www.sec.gov/Archives/edgar/daily-index/bulkdata/companyfacts.zip",
  submissions: "https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip",
} as const;

const ALLOWED_SEC_HOSTS = new Set(["www.sec.gov", "data.sec.gov"]);

/**
 * First live pulls may only be bulk zips or daily/full index files.
 * Per-CIK companyfacts JSON is forbidden until bronze bulk exists (WP 0.3+).
 */
const ALLOWED_SEC_PATH =
  /^\/(Archives\/edgar\/(daily-index|full-index)\/|files\/)/;

export type IngestEnv = Record<string, string | undefined>;

export function liveIngestDecision(env: IngestEnv = process.env): { ok: true } | { ok: false; reason: string } {
  if (env[INGEST_ENABLE_ENV] !== "true") {
    return {
      ok: false,
      reason: `${INGEST_ENABLE_ENV} is not true. Fixture warehouse stays in use; SEC is not contacted.`,
    };
  }
  if (env[INGEST_CONFIRM_ENV] !== AGENT_TOKEN) {
    return {
      ok: false,
      reason: `${INGEST_CONFIRM_ENV} must equal ${AGENT_TOKEN}. This stops an accidental enable from a generic client.`,
    };
  }
  return { ok: true };
}

export function assertLiveIngestAllowed(env: IngestEnv = process.env): void {
  const decision = liveIngestDecision(env);
  if (!decision.ok) {
    throw new IngestBlockedError(decision.reason);
  }
}

export function assertSecUrlAllowed(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new HostNotAllowedError(`Not a valid URL: ${urlString}`);
  }
  if (url.protocol !== "https:") {
    throw new HostNotAllowedError("SEC ingest is HTTPS only.");
  }
  if (!ALLOWED_SEC_HOSTS.has(url.hostname)) {
    throw new HostNotAllowedError(`Host ${url.hostname} is not an allowed SEC host.`);
  }
  if (url.hostname === "data.sec.gov") {
    throw new HostNotAllowedError(
      "data.sec.gov per-CIK JSON is not allowed until bulk bronze exists. Use companyfacts.zip / submissions.zip.",
    );
  }
  if (!ALLOWED_SEC_PATH.test(url.pathname)) {
    throw new HostNotAllowedError(`Path ${url.pathname} is not on the SEC bulk/index allowlist.`);
  }
  if (/companyfacts\/CIK/i.test(url.pathname) || /submissions\/CIK/i.test(url.pathname)) {
    throw new HostNotAllowedError("Per-CIK JSON is not an allowed first pull.");
  }
  return url;
}

export function rateLimits() {
  return {
    targetRps: SEC_TARGET_RPS,
    hardCapRps: SEC_HARD_CAP_RPS,
    burstCapacity: 1,
  };
}
