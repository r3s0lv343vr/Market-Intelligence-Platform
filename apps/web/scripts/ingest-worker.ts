/**
 * Dedicated ingest worker. Automatic: waits for 3:30 a.m. US Eastern unless --once.
 * Never import from App Router. Does not run on Vercel.
 */
import { identityPublic } from "../lib/identity";
import { nextIngestAt } from "../lib/ingest/schedule";
import { runWorkerNight } from "../lib/ingest/worker-night";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWindow(): Promise<void> {
  for (;;) {
    const next = nextIngestAt(new Date());
    const waitMs = next.getTime() - Date.now();
    if (waitMs <= 0) return;
    console.log(`Next ingest window ${next.toISOString()}. Sleeping.`);
    await sleep(Math.min(waitMs, 30_000));
  }
}

async function main(): Promise<void> {
  if (process.env.VERCEL === "1") {
    console.error("Refusing: this worker is not for Vercel.");
    process.exit(2);
  }

  const once = process.argv.includes("--once");
  const id = identityPublic();
  console.log(`Identity: ${id.userAgent}`);
  console.log("Worker role. Users are not paused. Packs swap only after silver exists.");

  if (!once) {
    await waitForWindow();
  }

  const result = await runWorkerNight();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.contactedSec === false && result.action === "refuse-vercel-bulk" ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
