import { AGENT_TOKEN, INGEST_CONFIRM_ENV, INGEST_ENABLE_ENV } from "../identity";
import { liveIngestDecision, SEC_BULK_URLS, type IngestEnv } from "./policy";

/**
 * Operational answer: live SEC does not run on Vercel or on this cloud agent.
 * It runs on one dedicated worker host with persistent bronze disk.
 * This module must not import the SEC HTTP client or zip extractor.
 */
export function workerHostPlan(env: IngestEnv = process.env) {
  const live = liveIngestDecision(env);
  const onVercel = env.VERCEL === "1";
  const workerRole = env.TRACE_INGEST_HOST_ROLE === "worker";
  const liveBulkWouldPassHere = live.ok && !onVercel && workerRole && env[INGEST_CONFIRM_ENV] === AGENT_TOKEN;

  let liveBulkBlockReason: string | null = null;
  if (!live.ok) liveBulkBlockReason = live.reason;
  else if (onVercel) liveBulkBlockReason = "Vercel is the serving plane. Bulk zips are not downloaded here.";
  else if (!workerRole) liveBulkBlockReason = "TRACE_INGEST_HOST_ROLE must be worker for bulk zip ingest.";

  return {
    readyToContactSec: false,
    liveBulkWouldPassHere,
    liveBulkBlockReason,
    whereItRuns:
      "A single always-on worker you control — a small VPS or a machine with disk — not Vercel, not this Cursor cloud agent, not a second IP.",
    whenReady:
      "After you provision that host. The WP 0.3 stream-extract path is fixture-proven. Prefer waiting until silver (WP 0.6) so extracted CIK files become warehouse facts. A bronze-only first night is optional once the host exists.",
    doNotRunFrom: [
      "Vercel",
      "Cursor cloud agents",
      "browser / user API handlers",
      "a second IP added to scale ingest",
    ],
    requiredEnv: {
      [INGEST_ENABLE_ENV]: "true",
      [INGEST_CONFIRM_ENV]: AGENT_TOKEN,
      TRACE_INGEST_HOST_ROLE: "worker",
    },
    firstPulls: SEC_BULK_URLS,
    schedule: "3:30 a.m. America/New_York via npm run ingest:worker",
    storage: "Persistent disk or object store for write-once bronze. Serverless filesystems are not enough.",
  };
}
