/**
 * Prints identity and whether this process may contact EDGAR.
 * Use ingest-worker.ts for the automatic nightly job.
 */
import { identityPublic } from "../lib/identity";
import { liveBulkDecision } from "../lib/ingest/bulk";
import { SEC_BULK_URLS } from "../lib/ingest/policy";

function main(): void {
  const id = identityPublic();
  console.log(`Identity: ${id.userAgent}`);
  const bulk = liveBulkDecision();
  if (!bulk.ok) {
    console.log(`Refusing SEC contact: ${bulk.reason}`);
    console.log("Worker pulls (when gated on a non-Vercel host):");
    console.log(`  ${SEC_BULK_URLS.companyfacts}`);
    console.log(`  ${SEC_BULK_URLS.submissions}`);
    console.log("Then daily master.idx — list missing accessions, do not fetch them.");
    process.exit(0);
  }
  console.log("Gates are open. Run npm run ingest:worker:once on this host to stream zips into bronze.");
}

main();
