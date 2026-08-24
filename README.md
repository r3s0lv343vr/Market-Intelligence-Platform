# Trace Market Intelligence

P0 research UI on a **fixture warehouse**. The app does not call SEC, BLS, BEA, or other upstream APIs.

**Identity (ingest jobs only):** `TraceMI/0.1 (Trace Market Intelligence; tracemarketintelligence@gmail.com)`

Live SEC contact stays **off** until ingest is enabled on a dedicated host with both `TRACE_INGEST_ENABLED=true` and `TRACE_INGEST_CONFIRM=TraceMI/0.1`. User HTTP handlers cannot turn that on.

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

The fixture app is the Vercel project **`market-intelligence-platform`**. Root Directory is **`apps/web`**. Do not set ingest env vars on Vercel — serving and ingest stay separate.

Git auto-deploy needs the [Vercel GitHub app](https://github.com/apps/vercel) installed on this repo. Until then, production deploys are CLI uploads of this branch.

## Docs

- [docs/AI_GUIDE.md](docs/AI_GUIDE.md) — implementer rules
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — maps and gates
- [docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md](docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md) — architecture

## Design rule

User traffic never hits source APIs. One ingest identity, bulk zips first, 5 req/s target, circuit open on 403/429 with no retry.
