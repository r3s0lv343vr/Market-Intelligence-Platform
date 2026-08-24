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

Project root for Vercel: **`apps/web`**.

Connect this GitHub repo in the Vercel dashboard and set Root Directory to `apps/web`. No environment variables are required for the fixture deployment.

```bash
cd apps/web
npx vercel --yes
```

## Docs

- [docs/AI_GUIDE.md](docs/AI_GUIDE.md) — implementer rules
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — maps and gates
- [docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md](docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md) — architecture

## Design rule

User traffic never hits source APIs. Live ingest stays off until a User-Agent identity is provided.
