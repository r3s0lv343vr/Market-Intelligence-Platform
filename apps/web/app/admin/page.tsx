import { listCoverageEntities, listMacroSeries, listSources, warehouseHealth } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const health = warehouseHealth();
  const sources = listSources();
  const series = listMacroSeries();
  const entities = listCoverageEntities();
  const id = health.identity;
  const schedule = health.schedule;
  const catalog = health.catalog;
  const host = health.workerHost;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data status</h1>
        <p className="mt-2 text-sm text-mute">
          How Trace Market Intelligence updates: a clock runs the ingest job. People keep using the
          current copy until they refresh or switch pages.
        </p>
      </div>

      <section className="rounded-lg border border-line bg-panel p-4 space-y-3">
        <h2 className="text-sm font-semibold">Nightly update (automatic)</h2>
        <p className="text-sm leading-6 text-mute">
          SEC publishes bulk files around 3:00 a.m. US Eastern. Our job is scheduled for{" "}
          <span className="text-ink">{schedule.localTime} {schedule.timezone}</span> every day. You
          do not start it by hand. It is a timer, not a button.
        </p>
        <p className="text-sm leading-6 text-mute">
          The worker streams two bulk zips into write-once bronze and diffs the daily index. It does
          not fetch missing filing files. People keep the live pack; a new generation is published
          only after silver/gold exist.
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-mute">Next window</dt>
            <dd className="mt-1 text-sm tabular-nums">{schedule.nextRunAt}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute">Live generation</dt>
            <dd className="mt-1 text-sm">
              #{catalog.liveGeneration} · {catalog.livePackVersion}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-mute">Ingest running now</dt>
            <dd className="mt-1 text-sm">{catalog.ingestRunning ? "yes (staging copy)" : "no"}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute">User delay during ingest</dt>
            <dd className="mt-1 text-sm">none</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4 space-y-3">
        <h2 className="text-sm font-semibold">Where live ingest will run</h2>
        <p className="text-sm leading-6 text-mute">{host.whereItRuns}</p>
        <p className="text-sm leading-6 text-mute">{host.whenReady}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-mute">Ready to contact SEC from this host</dt>
            <dd className="mt-1 text-sm">{host.readyToContactSec ? "yes" : "no"}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute">Why not here</dt>
            <dd className="mt-1 text-sm">{host.liveBulkBlockReason ?? "gates would pass; still do not run from this plane"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-mute">Do not run from</dt>
            <dd className="mt-1 text-sm">{host.doNotRunFrom.join(" · ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute">Worker schedule</dt>
            <dd className="mt-1 text-sm">{host.schedule}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute">Bronze storage</dt>
            <dd className="mt-1 text-sm">{host.storage}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-semibold">Ingest identity</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-mute">Platform</dt>
            <dd className="mt-1 font-medium">{id.platformName}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute">Agent token</dt>
            <dd className="mt-1 font-mono text-sm">{id.agentToken}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-mute">User-Agent (locked)</dt>
            <dd className="mt-1 font-mono text-xs leading-5">{id.userAgent}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute">SEC budget</dt>
            <dd className="mt-1 text-sm">
              {id.secTargetRps} req/s target · {id.secHardCapRps} req/s hard cap
            </dd>
          </div>
          <div>
            <dt className="text-xs text-mute">Live ingest</dt>
            <dd className="mt-1 text-sm">{health.ingest.liveEnabled ? "enabled" : "disabled"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-mute">{health.ingest.flagCaution}</p>
      </section>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-3">
          <dt className="text-xs text-mute">Mode</dt>
          <dd className="mt-1 font-medium">{health.mode}</dd>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <dt className="text-xs text-mute">Live upstream calls</dt>
          <dd className="mt-1 font-medium tabular-nums">{health.liveUpstreamCalls}</dd>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <dt className="text-xs text-mute">Facts in warehouse</dt>
          <dd className="mt-1 font-medium tabular-nums">{health.facts}</dd>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <dt className="text-xs text-mute">Entities</dt>
          <dd className="mt-1 font-medium tabular-nums">
            {health.entities} · A {health.coverage.A} / B {health.coverage.B} / C {health.coverage.C}
          </dd>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <dt className="text-xs text-mute">Curated series</dt>
          <dd className="mt-1 font-medium tabular-nums">{health.series}</dd>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <dt className="text-xs text-mute">Pack companies</dt>
          <dd className="mt-1 font-medium tabular-nums">{health.companies}</dd>
        </div>
      </dl>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-mute">
            <tr>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Budget</th>
              <th className="px-3 py-2 font-medium">License</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-mute">{s.role}</div>
                </td>
                <td className="px-3 py-2">{s.status}</td>
                <td className="px-3 py-2 text-mute">{s.budgetNote}</td>
                <td className="px-3 py-2 text-mute">{s.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-mute">
            <tr>
              <th className="px-3 py-2 font-medium">Entity</th>
              <th className="px-3 py-2 font-medium">CIK</th>
              <th className="px-3 py-2 font-medium">SIC</th>
              <th className="px-3 py-2 font-medium">Tier</th>
              <th className="px-3 py-2 font-medium">Template</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((e) => (
              <tr key={e.cik} className="border-t border-line">
                <td className="px-3 py-2">
                  <div className="font-medium">
                    {e.ticker} <span className="text-mute font-normal">{e.name}</span>
                  </div>
                  <div className="text-xs text-mute">{e.industry}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{e.cik}</td>
                <td className="px-3 py-2">{e.sic}</td>
                <td className="px-3 py-2">{e.coverageTier}</td>
                <td className="px-3 py-2">{e.template}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-mute">
            <tr>
              <th className="px-3 py-2 font-medium">Series</th>
              <th className="px-3 py-2 font-medium">Official id</th>
              <th className="px-3 py-2 font-medium">Agency</th>
              <th className="px-3 py-2 font-medium">Fixture latest</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.seriesId} className="border-t border-line">
                <td className="px-3 py-2">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-mute">{s.citation}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{s.officialId}</td>
                <td className="px-3 py-2">{s.agency}</td>
                <td className="px-3 py-2 tabular-nums">
                  {s.fixture.latestDisplay} <span className="text-mute">· {s.fixture.asOf}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
