import { listSources, warehouseHealth } from "@/lib/warehouse";

export default function AdminPage() {
  const health = warehouseHealth();
  const sources = listSources();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data status</h1>
        <p className="mt-2 text-sm text-mute">
          Source-governance view. Live ingest is off until a User-Agent identity is provided.
        </p>
      </div>

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
    </div>
  );
}
