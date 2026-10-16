# Trace — Data storage and daily reconcile

**Product:** Trace Market Intelligence (`TraceMI/0.1`)  
**Status:** Architecture for P0 warehouse + live SEC worker. Fixture serving is coded; live silver load from bronze is the next wiring after the first accepted ingest.  
**Tracking:** [STATUS.md](./STATUS.md)

This is how company data is stored, how a **day’s changes** are found, and how a user sees a new number. Diffs are **not** a human spreadsheet review. Humans step in only when mapping or ingest health fails.

Evolution of the product is inevitable. This document and the [project map](./BUILD_PLAN.md) will be revised when a gate, source, or storage engine changes. A map change is a recorded decision, not a silent rewrite of history.

---

## 1. What SEC actually sends

SEC does **not** publish a “delta file” of what changed since yesterday.

Each night (~3:00 a.m. ET) they republish **complete** zips:

| File | Meaning |
| --- | --- |
| `companyfacts.zip` | Every reporting entity’s XBRL company-facts JSON (full snapshot) |
| `submissions.zip` | Every filer’s submissions JSON (full snapshot) |
| `master.YYYYMMDD.idx` | That calendar day’s accepted filings (accession list) |

“Daily reconcile” means **we compute the difference** between yesterday’s warehouse and today’s snapshot. We do not recrawl EDGAR company-by-company, and we do not unpack a second copy of the universe.

Official API note: [EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces).

---

## 2. Layers (what lives where)

```text
SEC (worker only, identified, ≤8 req/s)
        │
        ▼
Bronze    raw zips (dated, write-once) + live/ CIK JSON (one tree, CRC-patched)
        │  parseCompanyFactsJson / submissions JSON
        ▼
Silver    typed facts keyed by factKey  (upsert, never duplicate on replay)
        │  resolver (~20 corporate lines, GP/FCF calculated)
        ▼
Gold      statement_line + provenance
        │  buildPack
        ▼
Pack      versioned company JSON generation
        │  publish swap
        ▼
Website   Hostinger / preview reads the live pack only
```

| Layer | On disk / in process | Mutability |
| --- | --- | --- |
| **Bronze zips** | `data/bronze/sec/<dataset>/<YYYY-MM-DD>/*.zip` | Write-once. Keep last **two** days. |
| **Bronze live** | `data/bronze/sec/<dataset>/live/files/CIK*.json` + `.meta.json` | **One** tree. First night full extract. Later nights **replace only CIKs whose zip CRC-32 changed**. |
| **Silver** | Today: in-memory from fixtures. Live: upsert from changed CIK JSON (same `factKey` rules). At coverage scale: SQLite or Postgres — not a second unpack. | Insert/replace by `factKey`. |
| **Gold** | Derived from silver + mapping version | Rebuild from silver; never “fix” by refetching SEC. |
| **Pack** | `PackCatalog` live vs staging generation | Users keep **live** until staging publishes. |

**factKey** (already coded):  
`cik | taxonomy | tag | unit | periodEnd | duration | accession | dimensions`

A restatement is a **new accession**, hence a new key. Replay of the same zip cannot duplicate a fact.

Dated **zips** stay immutable. **live/** is a materialization of the latest zip, not a second 40–70 GB tree per night.

---

## 3. How daily reconcile works (automatic)

Nightly job on the **worker** (`npm run ingest:worker`, 3:30 a.m. America/New_York). No analyst clicks “diff.”

```text
1. Download today’s companyfacts.zip + submissions.zip   →  2 identified GETs
2. Save as dated bronze zips (skip if that day’s zip already exists)
3. If live/ does not exist  →  stream-extract every CIK once, store CRC-32 in .meta.json
4. If live/ exists          →  for each zip entry:
        zip CRC-32 == live .meta.json crc32  →  skip (unchanged)
        else                                 →  stream that one JSON over the live file
5. Download master.YYYYMMDD.idx
6. Diff accessions vs watermark of accessions already in silver
        →  write diff.json (list only in WP 0.3; do not fetch .txt)
7. Keep last two zip-day folders; never delete live/
8. Parse only changed CIK JSON → silver upsert by factKey
9. Resolver → gold for affected CIKs (Tier A first)
10. Staging packs → publish new generation
11. Serving plane (Hostinger) still has the previous packs until the new generation is copied/swapped
```

Step 4 does **not** decompress every file into a new directory. Unchanged entries are skipped using the **CRC-32 in the zip central directory** compared to the sidecar from the first extract. Only changed (or new) CIK files are streamed to disk.

### 3.1 Three automatic differences

| Diff | Input | Output | Human? |
| --- | --- | --- | --- |
| **Content** | New zip vs `live/` CRC-32 | Which `CIK*.json` to rewrite | No |
| **Filings** | `master.idx` vs known accession set | Which accessions are new (sample in `diff.json`) | No |
| **Facts** | Parse those CIK files | New/updated silver rows by `factKey` | No |

**Not manual:** choosing which revenue number moved. The warehouse applies the parser and the resolver.

**Manual (ops / mapping only):**

- HTTP **403/429** — circuit opens; no retry; human fixes identity or waits.
- **Identity tests** fail (wrong tag, bank treated as corporate) — mapping queue; gold not silently invented.
- **Unmapped / missing** stays missing on the page until a mapping version is approved.
- Coverage tier A/B/C — product decision, not a nightly click.

WP 0.3 **lists** missing filing `.txt` accessions. Fetching those bodies is **P2** (Tier A incremental), still a worker job, still not a user-triggered SEC call.

---

## 4. How the user gets the update

Users never watch ingest. They never hit `data.sec.gov`.

```text
While worker runs     →  website keeps serving the current live pack
When gold is ready    →  staging packs publish as generation N+1
On next page load     →  user sees new figures with provenance
                        (tag, accession, form, filed-at, mapping version)
```

If ingest fails, **last-good packs** stay up. That is the product remaining available, not a silent zero.

Copying packs from the worker to Hostinger is an **ops sync** of already-built JSON (scp/rsync/object store), not a second EDGAR identity.

---

## 5. Technologies (what we use and what we add)

**Already in this repo**

| Piece | Technology |
| --- | --- |
| Serving app | Next.js 15 (App Router), React 19, TypeScript |
| Worker | Node.js 22, `tsx`, `npm run ingest:worker` |
| Zip stream | `yauzl` (lazy entries; no full unzip to a second tree) |
| Integrity | SHA-256 of bronze bytes; zip **CRC-32** for cheap nightly equality |
| HTTP to SEC | Identified `User-Agent`, token bucket ~5–8 req/s, circuit on 403/429 |
| Facts | `parseCompanyFactsJson` → `factKey` Map upsert |
| Statements | Resolver (~20 corporate lines); GP/FCF calculated in code |
| User payload | Versioned **company pack**; `PackCatalog` live vs staging |
| Site | Hostinger Node SSR (production); Vercel preview only |

**When live coverage outgrows fixture RAM**

| Piece | Technology | When |
| --- | --- | --- |
| Silver store | **SQLite** (`better-sqlite3`) on the worker, or **PostgreSQL** if serving and worker share a VPC | After first live bronze, before tens of thousands of CIKs in process memory |
| Pack files | JSON on disk or object storage; cache in Next.js | Same as now; generation id in the filename or catalog |
| Pack sync | `rsync`/`scp` worker → Hostinger, or shared object bucket | When gold is not built on the web host |
| OS on ThinkCentre | **WSL2 Ubuntu 24.04** + Node 22 (not 800k files on NTFS) | Home worker |

Do **not** add: Kafka for P0, a second ontology runtime, Akashic live proxies, or extra SEC IPs.

---

## 6. What is coded vs not yet wired

| Step | Coded |
| --- | --- |
| Fixture packs, resolver, provenance UI | Yes |
| Ingest gates, circuit, bulk zip download, first `live/` extract | Yes |
| CRC reconcile onto `live/` (changed CIKs only) | Yes |
| `master.idx` parse + accession diff (no `.txt` fetch) | Yes |
| Silver parser for companyfacts JSON | Yes (from objects already on disk) |
| Nightly job: parse changed CIKs → silver DB → rebuild affected packs → Hostinger swap | **Not wired to live SEC yet** (fixture catalog today) |
| P2 fetch of missing accession `.txt` | Not in WP 0.3 |

---

## 7. The map will move

The [project map](./BUILD_PLAN.md) is the current contract, not a frozen prophecy.

- New sources, a SQLite silver store, PDS instead of HTTP, or a company-geography pane may be added **when a gate says so**.
- When that happens: update **STATUS.md** (what is true), **BUILD_PLAN.md** (where it sits), and this file (how bytes move).
- Do not pretend an old disk size or an old VPS sketch is still the requirement if the written architecture changed.
- Parked briefs (Lattice, P6, agility, geography) stay parked until you mark **include**.

Reply **include / reject / defer / discuss** on parked items. Unmarked work stays out of the running app.
