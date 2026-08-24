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
      "Do not enable live ingest from Vercel request handlers or from shared cloud-agent IPs. One identity, bulk zips first, stop on 403/429.",
  };
}
