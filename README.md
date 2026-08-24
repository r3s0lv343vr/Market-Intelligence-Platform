# Market Intelligence Platform

P0 research UI on a **fixture warehouse**. The app does not call SEC, BLS, BEA, or other upstream APIs.

## Run locally

```bash
cd apps/web
npm install
npm test
npm run dev
```

Open http://localhost:3000 — search NSM, HBT, or LATT.

## Vercel

The fixture app is the Vercel project **`market-intelligence-platform`**. Root Directory is **`apps/web`**. No environment variables are required.

Git auto-deploy needs the [Vercel GitHub app](https://github.com/apps/vercel) installed on this repo. Until then, production deploys are CLI uploads of this branch.

## Docs

- [docs/AI_GUIDE.md](docs/AI_GUIDE.md) — implementer rules
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — maps and gates
- [docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md](docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md) — architecture

## Design rule

User traffic never hits source APIs. Live ingest stays off until a User-Agent identity is provided.
