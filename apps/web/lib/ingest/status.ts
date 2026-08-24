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
    requestsSent: 0,
    rate: rateLimits(),
    firstPullsIfEnabled: SEC_BULK_URLS,
    servingRule: "User HTTP handlers read the warehouse only. They never construct an ingest client.",
    flagCaution:
      "Automatic nightly job at 3:30 a.m. US Eastern. The website never downloads EDGAR. A worker builds a new pack copy, then swaps it. People keep reading the current copy until they refresh or open another page.",
  };
}
