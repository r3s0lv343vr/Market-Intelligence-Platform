import { liveBulkDecision, runSecBulkIngest } from "./bulk";
import { liveIngestDecision, type IngestEnv } from "./policy";
import { easternDateKey, schedulePublic } from "./schedule";
import { getCatalog, rebuildFromWarehouse } from "../packs/runtime";
import type { PackCatalog } from "../packs/catalog";
import type { IngestControlPlane } from "./control-plane";

/**
 * Nightly worker. Not imported by App Router / Vercel cron.
 * Live SEC only when worker + TraceMI confirm + not Vercel.
 */
export async function runWorkerNight(opts: {
  now?: Date;
  env?: IngestEnv;
  cwd?: string;
  catalog?: PackCatalog;
  plane?: IngestControlPlane;
  wait?: () => Promise<void>;
} = {}) {
  const now = opts.now ?? new Date();
  const env = opts.env ?? process.env;
  const schedule = schedulePublic(now);
  const bulk = liveBulkDecision(env);

  if (bulk.ok) {
    const result = await runSecBulkIngest({
      now,
      env,
      cwd: opts.cwd,
      plane: opts.plane,
    });
    return {
      ...result,
      schedule,
      packs: "unchanged-until-silver",
      userImpact: "none",
      note: "Bronze extract does not rebuild user packs. Silver/gold (WP 0.6–0.8) will publish a new generation.",
    };
  }

  if (liveIngestDecision(env).ok && env.VERCEL === "1") {
    return {
      action: "refuse-vercel-bulk",
      contactedSec: false,
      userImpact: "none",
      reason: bulk.reason,
      schedule,
    };
  }

  const catalog = opts.catalog ?? getCatalog();
  const day = easternDateKey(now);
  if (catalog.alreadyPublishedOn(day)) {
    return {
      action: "skip-already-published",
      contactedSec: false,
      userImpact: "none",
      schedule,
      catalog: catalog.snapshot(),
    };
  }

  const before = catalog.snapshot();
  const published = await rebuildFromWarehouse(catalog, `${before.livePackVersion}+${day}`, now, opts.wait);
  return {
    action: "published-staging-from-warehouse",
    contactedSec: false,
    userImpact: "none-during-run; new pack on next page load",
    published,
    schedule,
    catalog: catalog.snapshot(),
    bronze: "fixture-only; live zip extract requires worker gates",
  };
}
