import Link from "next/link";
import { searchCompanies } from "@/lib/warehouse";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = searchCompanies(q);

  return (
    <div className="space-y-8">
      <section className="max-w-2xl">
        <p className="text-xs uppercase tracking-wide text-mute">TraceMI/0.1 · P0 warehouse · fixtures only</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Do not just see the numbers. Understand what is driving them.
        </h1>
        <p className="mt-3 text-sm leading-6 text-mute">
          Company → change → explanation → evidence. This site uses sample companies only.
          Real SEC files wait until you have a worker computer. Reloading never calls the SEC.
        </p>
      </section>

      <form action="/" className="flex max-w-xl gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search ticker, name, CIK, SIC, or alias"
          className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-mute"
        />
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm text-bg">
          Search
        </button>
      </form>

      <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
        {results.map((c) => (
          <li key={c.ticker}>
            {c.hasPack ? (
              <Link
                href={`/companies/${c.ticker}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-bg"
              >
                <div>
                  <div className="font-medium">
                    {c.ticker} <span className="text-mute font-normal">{c.name}</span>
                  </div>
                  <div className="text-xs text-mute">
                    SIC {c.sic} · tier {c.coverageTier} · {c.industry} · {c.template} template
                    {c.latestForm ? ` · ${c.latestForm} ${c.latestPeriod}` : ""}
                  </div>
                </div>
                <span className="text-sm text-mute">Open →</span>
              </Link>
            ) : (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">
                    {c.ticker} <span className="text-mute font-normal">{c.name}</span>
                  </div>
                  <div className="text-xs text-mute">
                    SIC {c.sic} · tier {c.coverageTier} · {c.industry} · not in the live pack
                  </div>
                </div>
                <span className="text-sm text-mute">Identity only</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
