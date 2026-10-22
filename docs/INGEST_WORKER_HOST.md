# Where live SEC ingest will run

**Short answer:** a machine **you** control on a **residential or small-office ISP**. Not Vercel, not Hostinger, not this cloud agent, not another cloud/trading VPS after two 403s.

Tracking: [STATUS.md](./STATUS.md).  
Hands-on cable / RDP / timer: [WORKER_SETUP.md](./WORKER_SETUP.md). Windows 11 Pro is valid; WSL is optional.

## Ingest shape (storage)

This matches [BUILD_PLAN.md](./BUILD_PLAN.md) §2.2 and the investigation: **backfill once, then reconcile**.

```text
First accepted night
  → download companyfacts.zip + submissions.zip  (~3–4 GB compressed)
  → unpack once into data/bronze/sec/<dataset>/live/files/  (~40–70 GB JSON)
  → save dated zips; diff master.idx (list missing accessions; do not fetch .txt)

Later nights
  → download that night’s zips (few GB) + daily index
  → do not unpack a second copy of the universe
  → keep the last two dated zip folders; live/ extract stays
  → silver/gold later rebuild from the latest zip (not a new 800k-file tree each night)
```

SEC **republishes full zips** every night. Trace does **not** keep a full **unpack** every night. That was the original scope; a dated-folder unpack would have been overbearing and is not the worker behavior.

**160 GB / 8 GB RAM** was the Linux worker size for **one** generation (OS + live extract + current zips + headroom). It was never “160 GB of new bronze per night.”

| Disk | When it is enough |
| --- | --- |
| **160 GB Linux** | Original P0 worker. Tight but aligned with one extract. **Do not use a new cloud VPS for SEC** — those IPs were refused |
| **256 GB Windows 11** | CPU/RAM (16 GB) are fine. Disk is tight because **Windows uses 70–100 GB**, not because nightly extracts stack. First night possible on a clean disk + WSL2 |
| **512 GB** | Comfortable Windows + WSL2 + first extract + two zips + updates |
| **1 TB** | Optional. Not a new project requirement |
| **2 TB** | Only if you deliberately keep many full unpacks. **The product does not** |

P6 **250 GB+** is later (trade/weather), not the nightly SEC job.

Official bulk URLs: [EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces). Companyfacts is documented under `.../daily-index/xbrl/companyfacts.zip`; confirm on the first live GET if the worker’s path 404s. One identified request; circuit on 403.

## When are we ready?

WP 0.3 is **fixture-proven**. Live needs:

```text
TRACE_INGEST_ENABLED=true
TRACE_INGEST_CONFIRM=TraceMI/0.1
TRACE_INGEST_HOST_ROLE=worker
and not VERCEL=1
```

Those flags are **not** set on Vercel or Hostinger and must **not** be set on this cloud agent.

Prefer waiting until silver can load the live extract (WP 0.6 is coded for fixtures). A bronze-only first night is optional once the host exists.

This agent will not flip the switch and will not call `www.sec.gov` or `data.sec.gov`.

## Where it will run

One always-on worker:

- **Home/office PC** (e.g. ThinkCentre, Windows 11 Pro + Node 22) on the house/office ISP  
- Persistent disk for bronze (not a serverless filesystem)  
- **One** public IPv4 — do not add a second IP to “scale” ingest  
- Timer: `npm run ingest:worker` at 3:30 a.m. America/New_York  

Website serving stays Hostinger (production) / Vercel (preview). `/api/cron/ingest` is a clock only.

Cloud VPS (Hetzner, DigitalOcean) already **403**’d with a correct User-Agent. Trading/low-latency VPS is the same class. **Next HTTP try is home/office ISP**, then webmaster, then PDS — not a third datacenter.

## What not to do

| Do not | Why |
| --- | --- |
| Set the three env vars on Vercel or Hostinger | Serving plane. No EDGAR from user traffic or cron. |
| Run ingest from a Cursor cloud agent | Wrong IP; ephemeral disk. |
| Add IPs or extra User-Agents | 10 req/s per requester across machines. |
| Fetch per-CIK JSON first | Bulk zips + daily index only until live bronze exists. |
| Retry on 403/429 | Circuit opens. Humans fix. Replay bronze. |
| Unpack a new universe every night | Overbearing; not the plan. |
| VPN / residential proxy / extra VPS after 403 | Looks like evasion; does not fix WAF class. |

## First live pull (when the host exists)

1. Identity: `TraceMI/0.1 (Trace Market Intelligence; tracemarketintelligence@gmail.com)`  
2. Bronze on persistent disk on that PC (Windows path is fine; WSL is optional)  
3. Three env vars **only** on that host  
4. `npm run ingest:worker:once` — first night: stream zips, extract **once** to `live/`, diff `master.idx`  
5. Do **not** fetch missing filing `.txt` files  
6. Do **not** rebuild user packs until silver/gold run from that bronze  

Keys for BLS / BEA / EIA / Census, when those connectors ship, also live only on this worker.
