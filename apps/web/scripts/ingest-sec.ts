/**
 * SEC ingest job entry. Refuses to contact EDGAR unless both env gates are set.
 * Never import this from App Router routes. Does not download in WP 0.2.
 */
import { identityPublic } from "../lib/identity";
import { liveIngestDecision, SEC_BULK_URLS } from "../lib/ingest/policy";

function main(): void {
  const id = identityPublic();
  console.log(`Identity: ${id.userAgent}`);
  console.log("Live ingest is a job, not a page load.");

  const decision = liveIngestDecision();
  if (!decision.ok) {
    console.log(`Refusing SEC contact: ${decision.reason}`);
    console.log("Would pull (when enabled, WP 0.3):");
    console.log(`  ${SEC_BULK_URLS.companyfacts}`);
    console.log(`  ${SEC_BULK_URLS.submissions}`);
    process.exit(0);
  }

  console.error("Live ingest flags are set. This script still does not download. Unset TRACE_INGEST_ENABLED on any website host.");
  process.exit(2);
}

main();
