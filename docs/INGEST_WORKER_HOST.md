# Where live SEC ingest will run

**Short answer:** not here, not on Vercel, and not until you provision a dedicated worker host. The product is not waiting on a button. It is waiting on a machine with disk and one identity.

## When are we ready?

The WP 0.3 stream-extract path is **fixture-proven**. The gates already required for a live night are:

```text
TRACE_INGEST_ENABLED=true
TRACE_INGEST_CONFIRM=TraceMI/0.1
TRACE_INGEST_HOST_ROLE=worker
and not VERCEL=1
```

Those flags are **not** set on Vercel and must **not** be set on this Cursor cloud agent.

A first live night should wait until **you** stand up that host. Prefer waiting until **WP 0.6 (silver)** so extracted CIK files become warehouse facts. A bronze-only first night is optional once the host exists, if you want the zips cached before silver ships.

This agent will not flip the switch and will not call `www.sec.gov` or `data.sec.gov`.

## Where it will run

One always-on worker **you** control:

- A small VPS (DigitalOcean, Lightsail, Hetzner, or similar) **or** a machine at home/office
- Persistent disk or object store for write-once bronze (serverless filesystems are not enough)
- **One** public IP — do not add a second IP to “scale” ingest
- Timer: `npm run ingest:worker` at 3:30 a.m. America/New_York (SEC bulk files land around 3:00 a.m. ET)

The website on Vercel stays the serving plane. `/api/cron/ingest` is a clock only. Users keep the current pack until they refresh or change pages.

## What not to do

| Do not | Why |
| --- | --- |
| Set the three env vars on Vercel | Serving plane. No EDGAR from user traffic or cron. |
| Run ingest from a Cursor cloud agent | Ephemeral disk; wrong IP; easy to get the identity flagged. |
| Add IPs or extra User-Agents | The SEC counts 10 req/s per requester across machines. |
| Fetch per-CIK JSON first | Bulk `companyfacts.zip` + `submissions.zip` only, then daily `master.idx`. |
| Retry on 403/429 | Circuit opens. Humans fix. Replay bronze. |

## First live pull (when the host exists)

1. Confirm identity: `TraceMI/0.1 (Trace Market Intelligence; tracemarketintelligence@gmail.com)`
2. Confirm bronze directory is on persistent disk
3. Set the three env vars **only** on that host
4. `npm run ingest:worker:once` — stream the two zips, extract CIK files, diff `master.idx`
5. Do **not** fetch missing filing `.txt` files
6. Do **not** rebuild user packs until silver/gold exist

Keys for BLS / BEA / EIA / Census, when those connectors ship, also live only on this worker — never on Vercel.
