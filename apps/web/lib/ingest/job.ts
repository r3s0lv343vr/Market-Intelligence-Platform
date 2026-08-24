import { liveIngestDecision, type IngestEnv } from "./policy";
import { easternDateKey, schedulePublic } from "./schedule";
import { getCatalog, rebuildFromWarehouse } from "../packs/runtime";
import type { PackCatalog } from "../packs/catalog";

export type HostRole = "serving" | "worker";

export function hostRole(env: IngestEnv = process.env): HostRole {
  return env.TRACE_INGEST_HOST_ROLE === "worker" ? "worker" : "serving";
}

/**
 * Automatic nightly tick.
 * Serving hosts (the website) never download EDGAR — they only keep serving the live pack.
 * A worker host may rebuild a staging copy; live SEC stays behind the existing dual gate.
 */
export async function runScheduledTick(opts: {
  now?: Date;
  env?: IngestEnv;
  wait?: () => Promise<void>;
  catalog?: PackCatalog;
} = {}) {
  const now = opts.now ?? new Date();
  const env = opts.env ?? process.env;
  const role = hostRole(env);
  const catalog = opts.catalog ?? getCatalog();
  const schedule = schedulePublic(now);
  const day = easternDateKey(now);
  const liveDecision = liveIngestDecision(env);

  if (catalog.alreadyPublishedOn(day)) {
    return {
      action: "skip-already-published",
      role,
      userImpact: "none",
      contactedSec: false,
      schedule,
      catalog: catalog.snapshot(),
    };
  }

  if (role !== "worker") {
    return {
      action: "heartbeat-serving-plane",
      role,
      userImpact: "none",
      contactedSec: false,
      reason:
        "This process serves packs. The nightly zip download runs on the worker role, then publishes a new live generation. People already on the site are not paused.",
      schedule,
      catalog: catalog.snapshot(),
    };
  }

  if (liveDecision.ok) {
    return {
      action: "refuse-live-zip-until-persistent-bronze",
      role,
      userImpact: "none",
      contactedSec: false,
      reason:
        "Worker role is on, but streaming companyfacts.zip needs persistent bronze storage. Live EDGAR is not contacted from this tick.",
      schedule,
      catalog: catalog.snapshot(),
    };
  }

  const before = catalog.snapshot();
  const published = await rebuildFromWarehouse(catalog, `${before.livePackVersion}+${day}`, now, opts.wait);
  return {
    action: "published-staging-from-warehouse",
    role,
    userImpact: "none-during-run; new pack on next page load",
    contactedSec: false,
    published,
    schedule,
    catalog: catalog.snapshot(),
  };
}
