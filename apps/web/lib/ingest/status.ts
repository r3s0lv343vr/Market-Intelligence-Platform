import { identityPublic } from "../identity";
import { liveIngestDecision, rateLimits, SEC_BULK_URLS } from "./policy";

export function ingestStatus(env: NodeJS.ProcessEnv = process.env) {
  const decision = liveIngestDecision(env);
  const identity = identityPublic();
  return {
    identity,
    liveEnabled: decision.ok,
    liveBlockReason: decision.ok ? null : decision.reason,
    circuit: "closed" as const,
    lastIngestAt: null,
    http403: 0,
    http429: 0,
    requestsSent: 0,
    budgetRemainingRps: identity.secHardCapRps,
    rate: rateLimits(),
    firstPullsIfEnabled: SEC_BULK_URLS,
    servingRule: "User HTTP handlers read the warehouse only. They never construct an ingest client.",
    flagCaution:
      "Automatic 3:30 a.m. US Eastern worker streams companyfacts.zip and submissions.zip into write-once bronze, then diffs the daily index without fetching missing filings. The website never downloads EDGAR. Users keep the live pack until silver/gold publishes a new generation.",
  };
}
