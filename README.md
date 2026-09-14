# Trace Market Intelligence

P0 research UI on a **fixture warehouse**. The website does not call SEC, BLS, BEA, or other upstream APIs.

**Identity (ingest jobs only):** `TraceMI/0.1 (Trace Market Intelligence; tracemarketintelligence@gmail.com)`

## How updates work

There are two planes:

1. **Website (serving)** — what people use. It only reads the **live** pack. A page load never waits for a download.
2. **Nightly worker (ingest)** — a timer at **3:30 a.m. US Eastern**. It streams `companyfacts.zip` and `submissions.zip` into write-once bronze and diffs the daily index (lists missing accessions; does not fetch them). User packs are not rebuilt until silver/gold. You do not click this.

While the worker runs, people anywhere in the world keep using the current copy. When they refresh or open another page, they get a new copy only after a generation is published.

Live EDGAR stays off on the website. On a worker host, set `TRACE_INGEST_HOST_ROLE=worker`, `TRACE_INGEST_ENABLED=true`, and `TRACE_INGEST_CONFIRM=TraceMI/0.1`. Do not set those on Vercel.

```bash
cd apps/web
npm run ingest:worker          # waits for 3:30 a.m. US Eastern
npm run ingest:worker:once     # run the tick now (still refuses SEC without the gates)
```

## Run locally

```bash
cd apps/web
npm install
npm test
npm run ingest:sec
npm run dev
```

`npm run ingest:sec` prints the identity and **refuses** to contact EDGAR. Open http://localhost:3000 — search NSM, HBT, or LATT.

## Vercel

The website is the Vercel project **`market-intelligence-platform`**. Root Directory is **`apps/web`**. A daily cron at 08:30 UTC is the clock; that route does not download EDGAR.

Git auto-deploy needs the [Vercel GitHub app](https://github.com/apps/vercel) installed on this repo. Until then, production deploys are CLI uploads of this branch.

## Docs

- [docs/AI_GUIDE.md](docs/AI_GUIDE.md) — implementer rules
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — maps and gates
- [docs/INTELLIGENCE_CORE_DECISIONS.md](docs/INTELLIGENCE_CORE_DECISIONS.md) — intelligence-core items for individual accept/reject ([PDF](docs/INTELLIGENCE_CORE_DECISIONS.pdf))
- [docs/ECONOMIC_DATA_AGILITY.md](docs/ECONOMIC_DATA_AGILITY.md) — complements Lattice (parked; not P0–P4)

## Design rule

User traffic never hits source APIs. One ingest identity, bulk zips first, 5 req/s target, circuit open on 403/429 with no retry.
