"use client";

import { useMemo, useState } from "react";
import type { CompanyPack, StatementLine } from "@/lib/types";
import { lineValue, pct, trustLabel } from "@/lib/format";

const tabs = ["Overview", "Financials", "Filings", "Peers", "Drivers"] as const;

function priorPeriod(lines: StatementLine[], latest: string): string | undefined {
  return [...new Set(lines.map((l) => l.periodEnd))].filter((p) => p < latest).sort().at(-1);
}

function yoyFor(lines: StatementLine[], concept: string, latest: string): number | null {
  const prior = priorPeriod(lines, latest);
  if (!prior) return null;
  const curr = lines.find((l) => l.concept === concept && l.periodEnd === latest)?.value;
  const prev = lines.find((l) => l.concept === concept && l.periodEnd === prior)?.value;
  if (curr == null || prev == null || !prev) return null;
  return (curr - prev) / prev;
}

function Provenance({ line }: { line: StatementLine }) {
  const p = line.provenance;
  if (!p.tag) return <span className="text-mute">—</span>;
  return (
    <span title={`${p.tag} · ${p.form} · ${p.accession} · filed ${p.filedAt} · ${p.mappingVersion} · confidence ${p.confidence}`}>
      {p.tag} · {p.form} · filed {p.filedAt}
    </span>
  );
}

export function CompanyView({ pack }: { pack: CompanyPack }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [openSignal, setOpenSignal] = useState<string | null>(pack.signals[0]?.id ?? null);
  const [openLine, setOpenLine] = useState<string | null>(null);

  const latestLines = useMemo(
    () => pack.lines.filter((l) => l.periodEnd === pack.company.latestPeriod),
    [pack],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-mute">
          {pack.company.industry} · SIC {pack.company.sic} · tier {pack.company.coverageTier} ·{" "}
          {pack.company.latestForm} · {pack.company.latestPeriod}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {pack.company.name}{" "}
          <span className="text-mute font-medium">{pack.company.ticker}</span>
        </h1>
        <p className="mt-2 text-sm text-mute">
          Shared pack generation {pack.generation} · {pack.packVersion} · {pack.mappingVersion} ·
          published {pack.publishedAt.slice(0, 16)}Z
        </p>
        <p className="mt-1 text-xs text-mute">{pack.disclaimer}</p>
      </div>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-semibold">What changed</h2>
        <div className="mt-3 space-y-2">
          {pack.signals.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpenSignal(openSignal === s.id ? null : s.id)}
              className="w-full rounded-md border border-line bg-bg px-3 py-2 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span
                    className={
                      s.polarity === "positive"
                        ? "text-pos"
                        : s.polarity === "negative"
                          ? "text-neg"
                          : "text-warn"
                    }
                  >
                    {s.polarity === "positive" ? "[+]" : s.polarity === "negative" ? "[-]" : "[!]"}
                  </span>{" "}
                  {s.title}
                </span>
                <span className="text-xs text-mute">{trustLabel(s.trust)}</span>
              </div>
              <p className="mt-1 text-sm text-mute">{s.summary}</p>
              {openSignal === s.id && (
                <div className="mt-3 border-t border-line pt-3 text-sm">
                  <div className="font-mono text-xs text-mute">{s.evidence.formula}</div>
                  <ul className="mt-2 space-y-1">
                    {s.evidence.inputs.map((i) => (
                      <li key={i.label}>
                        {i.label}: <span className="tabular-nums">{i.value}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-mute">Inspect next: {s.inspect}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-sm ${
              tab === t ? "bg-ink text-bg" : "border border-line text-mute hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-3">
          <p className="max-w-3xl text-sm leading-6 text-mute">
            Company → change → explanation → evidence. Hover or open a line for the tag, filing,
            and date. Gaps stay gaps. Reloading this page does not call the SEC.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {latestLines
              .filter((l) => ["revenue", "gross_profit", "net_income", "total_assets", "fcf", "inventory"].includes(l.concept))
              .map((l) => (
                <div key={l.concept} className="rounded-lg border border-line bg-panel px-3 py-2">
                  <div className="text-xs text-mute">{l.label}</div>
                  <div className="mt-1 text-lg tabular-nums">
                    {l.gap ? <span className="text-warn text-sm">{l.gap}</span> : lineValue(l.value, l.unit)}
                  </div>
                  <div className="mt-1 text-xs text-mute">
                    {trustLabel(l.trust)} · <Provenance line={l} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "Financials" && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-panel text-left text-mute">
              <tr>
                <th className="px-3 py-2 font-medium">Line</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">YoY</th>
                <th className="px-3 py-2 font-medium">Trust</th>
                <th className="px-3 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {latestLines.map((l) => (
                <tr key={l.concept} className="border-t border-line">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => setOpenLine(openLine === l.concept ? null : l.concept)}
                    >
                      {l.label}
                    </button>
                    {openLine === l.concept && (
                      <div className="mt-2 text-xs text-mute">
                        {l.provenance.tag ?? "no tag"} · accession {l.provenance.accession ?? "—"} ·{" "}
                        {l.provenance.form ?? "—"} · filed {l.provenance.filedAt ?? "—"} ·{" "}
                        {l.provenance.mappingVersion} · confidence {l.provenance.confidence}
                        {l.provenance.direct ? " · direct" : " · calculated"}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {l.gap ? <span className="text-warn">{l.gap}</span> : lineValue(l.value, l.unit)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{pct(yoyFor(pack.lines, l.concept, pack.company.latestPeriod))}</td>
                  <td className="px-3 py-2 text-mute">{trustLabel(l.trust)}</td>
                  <td className="px-3 py-2 text-xs text-mute">
                    <Provenance line={l} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Filings" && (
        <ul className="space-y-2">
          {pack.filings.map((f) => (
            <li key={f.accession} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
              <div className="font-medium">
                {f.form} · {f.periodEnd}
              </div>
              <div className="text-mute">
                {f.title} · filed {f.filedAt} · {f.accession}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "Peers" && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-panel text-left text-mute">
              <tr>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Revenue growth</th>
                <th className="px-3 py-2 font-medium">Inventory growth</th>
                <th className="px-3 py-2 font-medium">Op. margin Δ</th>
              </tr>
            </thead>
            <tbody>
              {pack.peers.map((p) => (
                <tr key={p.ticker} className="border-t border-line">
                  <td className="px-3 py-2">
                    {p.name} ({p.ticker})
                  </td>
                  <td className="px-3 py-2 tabular-nums">{pct(p.revenueGrowth)}</td>
                  <td className="px-3 py-2 tabular-nums">{pct(p.inventoryGrowth)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {p.marginChangePp == null ? "—" : `${(p.marginChangePp * 100).toFixed(1)} pp`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-xs text-mute">
            Demo peer set only. Industry codes are a starting point, not a locked universe.
          </p>
        </div>
      )}

      {tab === "Drivers" && (
        <ul className="space-y-2">
          {pack.drivers.map((d) => (
            <li key={d.seriesId} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
              <div className="font-medium">
                {d.label} <span className="text-mute">· {d.latest}</span>
              </div>
              <div className="text-mute">
                {d.source} · as of {d.asOf} · {d.copyrightClass}
              </div>
              <p className="mt-1">{d.plausibleFor}</p>
              <p className="text-mute">{d.note}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
