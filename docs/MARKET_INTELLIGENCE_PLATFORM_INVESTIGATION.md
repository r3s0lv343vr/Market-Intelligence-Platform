# Market Intelligence Platform — Build Investigation

This document is an investigation of what it would take to build a market-intelligence product that:

- Compiles government and public financial data into decision-useful views
- Pulls company financials from the SEC and related sources without being flagged
- Keeps that corpus current as quarterly (and intra-quarter) filings arrive
- Serves a **large user base** (far beyond an early cohort of ~1,500) with fast access
- Can later add AI assistance, financial modeling, statistics, and econometrics
- Can be enhanced beyond the first warehouse (events, as-of queries, semantic layer — §§19–20)

It is not an implementation plan for a specific stack, and it is not investment advice. It is a requirements and architecture investigation: what is hard, what is already solved by public data products, what will get a platform blocked, and what to build first versus later.

**Sources checked (as of August 2026):** [SEC Developer Resources](https://www.sec.gov/about/developer-resources), [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), [SEC Financial Statement Data Sets](https://www.sec.gov/data-research/sec-markets-data/financial-statement-data-sets), [SEC Financial Statement and Notes Data Sets](https://www.sec.gov/data-research/sec-markets-data/financial-statement-notes-data-sets), [FRED Terms of Use](https://fred.stlouisfed.org/legal/terms/), [BEA API User Guide](https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf), [BLS Public Data API](https://www.bls.gov/bls/api_features.htm), [Census API query limits](https://www.census.gov/data/developers/guidance/api-user-guide/query-components.html), [Treasury Fiscal Data API](https://fiscaldata.treasury.gov/api-documentation/), [EIA Open Data API](https://www.eia.gov/opendata/documentation.php). Rate limits and terms change; treat this as a design baseline and re-verify before production.

---

## 1. Executive findings

A platform like this is **feasible with public data**, but only if the product is designed as a **warehouse with scheduled ingest**, not as a live proxy in front of government APIs.

The single most important design rule:

> **User traffic never hits source APIs.** Users query your warehouse. A small number of controlled ingest jobs pull from SEC, FRED, BLS, BEA, Census, Treasury, EIA, and similar sources. Those jobs use official bulk files whenever they exist, identify themselves, and stay well under published limits.

If you let users — 50 concurrent analysts or hundreds of thousands of sessions — trigger per-company SEC calls, you will be rate-limited or IP-blocked. User count does not raise the SEC budget. The fair-access rule is **10 requests per second per requester, regardless of how many machines you use**. Spreading the same workload across IPs to evade that limit is exactly the behavior they reserve the right to block. A large audience makes the warehouse rule *stricter*, not looser.

The second most important finding:

> **Raw SEC XBRL is not market intelligence.** It is a filing extract. Comparable statements, peer groups, sector context, and decision views require a mapping layer, restatement handling, and joins to macro and industry data.

What this means for the build:

| Area | Feasibility | Hard part |
| --- | --- | --- |
| SEC + public-data ingest without flagging | High, if bulk-first | Discipline, not scale |
| Decision-useful compilation | High, but not automatic | XBRL normalization, entity resolution, pairing |
| Ongoing quarterly (and intra-quarter) updates | High | Filing-season surge + restatements |
| Fast access for a large user base | High if packs are shared | Serving, cache, tenancy — ingest stays constant |
| AI assistance | High for RAG/summaries; constrained for training | Numbers must come from the warehouse, not the model |
| Financial modeling | High | Standardized 3-statement mapping |
| Statistics | High | Point-in-time correctness |
| Econometrics | High as a later compute plane | Vintage data, job isolation, methodology |

A large audience is two problems at once: **data correctness** (wrong numbers, look-ahead, blocked source IPs) and **serving scale** (shared pack cache, isolated jobs, abuse, cost). Ingest does not grow with users. The read path, private-state store, and quotas do.

---

## 2. What “market intelligence” means here

A useful platform is not a filing dump and not a Bloomberg replica on day one. It is a system that answers questions such as:

- How is this company performing versus its own history and a defensible peer set?
- What changed in the latest 10-Q / 10-K, and is that change company-specific or macro?
- Which names in a sector show margin compression, leverage stress, or cash conversion deterioration?
- How do rates, labor, inflation, energy, or fiscal conditions change the backdrop for that sector?
- What would a simple model imply if I change growth, margin, or WACC assumptions?

Those questions require **joins across sources that were never designed to be joined**. That is the product.

### 2.1 Data the government will give you

- Company fundamentals and filing metadata (SEC EDGAR / XBRL)
- Macro time series (BEA, BLS, Census, Treasury, Fed publications, often mirrored on FRED)
- Sector and industry structure (Census, BLS QCEW, BEA industry accounts)
- Energy and commodities context (EIA)
- Banking condition (FDIC, FFIEC, OCC)
- Federal fiscal backdrop (Treasury Fiscal Data, USAspending)
- Some market-structure / positioning data (CFTC COT, FINRA short interest — with their own terms)

### 2.2 Data the government generally will not give you

- Real-time or delayed equity/options prices, corporate bond marks, and most mutual-fund NAVs
- Clean sell-side estimates / consensus
- Licensed news
- Private-company financials at public-company quality
- A ready-made comparable income statement for every filer

Prices and estimates are usually **licensed commercial data**. The first version can still be valuable with filing-based fundamentals plus macro overlays, then add a market-data vendor when the product needs valuation multiples that move intra-day.

### 2.3 The pairing principle

Some APIs are weak alone and strong together. Pairing should be a first-class product concept, not an afterthought.

| Decision question | Primary source | Pair with | Why |
| --- | --- | --- | --- |
| Company quality / trajectory | SEC company facts + submissions | Peer set + standardized statements | Isolated 10-K numbers are not insight |
| Is this a company problem or a cycle? | SEC fundamentals | BEA GDP / PCE, BLS employment & CPI, FRED/Treasury rates | Separates idiosyncratic vs macro |
| Sector capacity and labor | SEC industry cohort | Census / BLS industry employment and wages | Context for margins and hiring |
| Energy, utilities, transports, chemicals | SEC cohort | EIA prices, generation, inventories | Input-cost and demand shock overlay |
| Banks and credit | SEC bank filers + call-report concepts | FDIC BankFind / SOD, FFIEC, Treasury rates, yield curve | Banks do not map to a generic “revenue” line |
| Rates-sensitive models | SEC + user model | Treasury Fiscal Data auctions / yield curve, FRED selected public-domain series | Discount rates and refinancing risk |
| Positioning / crowding (later) | Fundamentals | CFTC COT, FINRA short interest | Not a substitute for fundamentals |
| Point-in-time backtests | As-filed SEC + vintage macro | ALFRED-style vintages or original-source release calendars | Revised GDP/jobs data creates look-ahead bias |

Do not pull every series from every agency. Choose a **small canonical overlay set** (rates, inflation, labor, growth, sector-specific inputs) and refresh it on the source’s own calendar.

---

## 3. Source inventory and access rules

### 3.1 SEC EDGAR — the core company corpus

Official surfaces:

| Surface | What it is | When to use |
| --- | --- | --- |
| `data.sec.gov/submissions/CIK##########.json` | Filing history and entity metadata | Incremental refresh of one filer |
| `data.sec.gov/api/xbrl/companyfacts/CIK##########.json` | All standard XBRL facts for one company | Incremental refresh of one filer |
| `data.sec.gov/api/xbrl/companyconcept/...` | One concept, one company, all periods | Rare; prefer facts or frames |
| `data.sec.gov/api/xbrl/frames/...` | One concept across all companies for a calendar period | Cross-section rebuilds |
| Nightly `companyfacts.zip` | All company-facts JSON | **Primary bulk load** |
| Nightly `submissions.zip` | All submissions JSON | **Primary filing-history load** |
| Daily / full indexes | Master lists of filings | Detect what is new |
| Atom / RSS “latest filings” | Near-real-time new form types | Trigger incremental pulls |
| DERA Financial Statement Data Sets | Flattened face financials (`SUB`, `NUM`, `PRE`, `TAG`) | Quarterly warehouse backfill / QA |
| DERA Financial Statement **and Notes** Data Sets | Face + notes, monthly | Narrative/note analytics, later |

Official facts that drive architecture:

- JSON APIs update **in real time** as filings disseminate (submissions typically under a second; XBRL typically under a minute; longer at peak).
- Bulk ZIPs are rebuilt nightly around **3:00 a.m. ET**.
- Fair access: **no more than 10 requests per second per user, regardless of the number of machines**.
- Identify automated traffic with a descriptive `User-Agent` that includes an organization name and contact email. Unclassified / default library user-agents are commonly blocked (`403`).
- The SEC reserves the right to **block IPs** that submit excessive requests and does not allow unclassified bots to crawl the site.
- `data.sec.gov` APIs do not require keys. That makes misuse easier, not safer.
- DERA face-financial ZIPs are on the order of **60–120 MB per recent quarter**. Notes archives are much larger (recent monthly files tens to hundreds of MB; older quarterly notes files often **400–800 MB**).
- Community reports of `submissions.zip` describe a **multi-gigabyte archive with hundreds of thousands of JSON files**. Treat unpacking and loading as a batch-engineering problem, not a script.

Recommended SEC strategy:

1. **Backfill** from nightly bulk ZIPs plus DERA quarterly sets.
2. **Daily reconcile** with the new nightly bulk (or a diff of daily indexes).
3. **Intraday incremental** only for new accessions detected via index/Atom, and only for CIKs you actually cover.
4. **Never** crawl HTML company pages or download every exhibit because a user opened a profile.

That keeps you inside 10 req/s with headroom. A universe of ~8,000 operating-company filers can be incrementally refreshed in well under an hour at 5–8 req/s. A full per-CIK crawl of all facts is unnecessary once you have the nightly zip.

### 3.2 Macro and industry sources

| Source | Typical access | Published limits / constraints | Best use |
| --- | --- | --- | --- |
| **FRED / ALFRED** | API key | Commonly cited ~120 req/min; terms also allow the Bank to change bandwidth/transaction caps. **Do not scrape the website.** Prefer bulk/category files for warehouse syncs. | Convenient overlay. **Not** a training corpus. Respect per-series copyright. Do not clone the FRED UX. |
| **BEA** | Registered UserID | 100 requests/min **and/or** 100 MB/min **and/or** 30 errors/min; then HTTP 429 + `RETRY-AFTER` | GDP, PCE, industry accounts, ITA |
| **BLS Public Data API 2.0** | Registration | 500 queries/day, up to 50 series/request, up to 20 years | CPI, payrolls, unemployment, PPI, wages |
| **Census** | Key recommended | 500 queries/IP/day without a key; 50 variables/query. Corporate NAT IPs share the unauthenticated budget. | ACS, Economic Census, business patterns |
| **Treasury Fiscal Data** | Open GET, optional key | Designed for bulk-friendly filters; data is public domain per Treasury | Debt, DTS, MTS, auctions, exchange rates |
| **EIA APIv2** | Required key | Throttle; keys temporarily suspend if abused. Default 5,000 rows/call. Community guidance often cites ~5 req/s and ~9,000/hour — re-verify on EIA’s current Open Data pages. | Energy prices, supply, generation |
| **FDIC / FFIEC / OCC** | Public APIs or bulk | Agency-specific | Banks, branches, enforcement |
| **CFTC / FINRA** | Mixed | FINRA in particular is request- and row-capped | Later overlays |

### 3.3 FRED is convenient and legally sharp

FRED is the easiest way to assemble a macro overlay, and the most dangerous source to treat casually.

From the current FRED terms (summarized; read the live page before shipping):

- Personal / educational use is the default grant.
- You may **not** use FRED services or content to **develop or train** ML / LLM / generative AI systems.
- You may **not** recreate the essential FRED experience or wholesale-mirror the database in violation of the terms.
- Third-party series on FRED keep their own copyright. Some require pre-approval for anything beyond personal use.
- Series labeled **Public Domain: Citation requested** and **Copyrighted: Citation required** may be used for **internal commercial** uses and client reports **with attribution**. That is not a blanket license to resell a FRED clone.
- Commercial redistribution of third-party proprietary series needs the owner’s permission. The St. Louis Fed will not obtain it for you.

For a commercial market-intelligence site, the safer pattern is:

- Prefer **original public-domain agency APIs** (BEA, BLS, Census, Treasury, EIA) for the warehouse.
- Use FRED only for a **small curated overlay**, with stored copyright flags, citations, and no AI training on the content.
- If you need a large vintage database for econometrics, plan a legal review and/or original-source vintage capture.

### 3.4 What “flagging” actually looks like

| Behavior | Likely outcome |
| --- | --- |
| Missing or generic `User-Agent` on SEC | `403`, temporary block |
| >10 req/s to SEC, or the same workload from many IPs | `403`/`429`, IP block (~10 minutes is commonly reported; longer if repeated) |
| HTML crawling of EDGAR search pages | Treated as unclassified bot |
| BLS/Census/BEA/EIA over daily or per-minute caps | `429`, key suspension, or IP throttle |
| FRED website scraping / wholesale mirror / AI training | Terms violation; key or access termination |
| Retry storms on 5xx without backoff | Looks like abuse even if each process is “under limit” |

The operational fix is a **single ingest control plane**: one global scheduler, one identity per source, token buckets, exponential backoff, circuit breakers, and a daily budget dashboard.

---

## 4. The ingest architecture that does not get you blocked

```text
                    ┌─────────────────────────────────────────┐
                    │  Source adapters (never user-facing)    │
                    │  SEC bulk/index/API · BEA · BLS ·       │
                    │  Census · Treasury · EIA · FDIC · …     │
                    └──────────────────┬──────────────────────┘
                                       │ rate-limited, identified
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  Ingest control plane                   │
                    │  calendars · token buckets · budgets    │
                    │  backoff · idempotent loads · lineage   │
                    └──────────────────┬──────────────────────┘
                                       ▼
          bronze object store (raw zip/json/txt, immutable)
                                       │
                                       ▼
          silver warehouse (parsed facts, series, entities)
                                       │
                                       ▼
          gold serving tables (standardized statements,
          peer stats, overlays, search docs, feature store)
                                       │
                    ┌──────────────────┴──────────────────────┐
                    │  Product APIs  ·  query cache  ·  jobs  │
                    └──────────────────┬──────────────────────┘
                                       ▼
                                 large user base (shared packs)
```

### 4.1 Non-negotiable rules

1. **Bulk over chatty.** One nightly `companyfacts.zip` is one request (plus a few for checksums/indexes). Eight thousand per-CIK calls are eight thousand requests.
2. **One requester identity.** The SEC counts you across machines. Do not “scale ingest horizontally” by adding IPs.
3. **Stay under the ceiling on purpose.** Target ~5–8 SEC req/s, not 10. Leave room for retries and humans.
4. **Identify yourself.** `User-Agent: MarketIntel Platform contact@yourdomain.com` (real mailbox that a human reads).
5. **Cache by accession and as-of date.** A 10-K does not change after dissemination. Re-fetching it because a user reloads a page is the definition of an unnecessary call.
6. **Idempotent loads.** Replaying yesterday’s zip must not duplicate facts.
7. **Honor calendars.** BLS/BEA/Census have release days. Pull once after the official release, not every hour.
8. **Quarterly surge plan.** Mid-February, mid-May, mid-August, and mid-November (plus 10-K season) are when EDGAR is slowest and your users most impatient. Prefer incremental accession pulls + nightly bulk reconcile, not a full universe recrawl.

### 4.2 Coverage tiers (so you do not ingest the world)

Not every EDGAR filer is useful. Funds, shells, and duplicate reporting entities will drown a first warehouse.

Suggested tiers:

| Tier | Who | Refresh |
| --- | --- | --- |
| A | Operating companies in the product universe (start with ~500–2,000 liquid names) | Incremental on new 10-Q/10-K/8-K; nightly reconcile |
| B | Broader filers needed for peer statistics | Nightly/weekly bulk |
| C | Funds, small reporting entities, historical-only | Bulk only, on demand |
| Macro | ~50–200 canonical series | On official release calendars |
| Filings text | 10-K/10-Q/8-K bodies for covered names | Incremental by accession, stored once |

This is how you stay fast and polite: most user value lives in Tier A + macro overlays.

### 4.3 Quarterly large-data reality

“Ongoing financial data, especially large data when filed quarterly” is three different jobs:

1. **Structured facts** — companyfacts / DERA `NUM` rows. Large in aggregate, cheap to serve once normalized.
2. **Filing artifacts** — HTML/iXBRL, exhibits. Large per company. Store in object storage; do not put blobs in Postgres.
3. **Notes datasets** — DERA notes ZIPs. Useful later for footnote search and AI grounding; do not block v1 on them.

Plan storage as:

- Object store: raw zips, filing HTML, extracted text, model artifacts
- Warehouse: typed facts, series, mappings
- Search index: filing sections (MD&A, risk factors, footnotes)
- Cache: hot company packs (latest statements, peers, overlays)

---

## 5. Backend, data management, and swift access

### 5.1 The real data problem is semantics, not download speed

XBRL is a shared dictionary that filers do not use the same way.

Known, recurring issues:

- **No universal tag for “revenue.”** Common tags include `Revenues`, `SalesRevenueNet`, `RevenueFromContractWithCustomerExcludingAssessedTax`, and `...IncludingAssessedTax`. Dual tagging of the same number is common after ASC 606.
- **Stale tags lie.** A companyfacts file can still contain a 2010 `Revenues` fact after the filer moved to a newer tag. “First tag that exists” can return the wrong decade.
- **Banks and insurers break generic statements.** Many never tag a top-line revenue total; they present net interest income + noninterest income and often do not use a classified balance sheet.
- **Custom extensions** (`exxon:CrudeOilAndProductPurchases`, `oracle:CloudServicesAndLicenseSupportExpenses`) are invisible to a fixed tag list.
- **Restatements and 10-K vs 10-Q.** The same period can appear in multiple filings. Serving logic needs “as originally filed” and “as most recently restated.”
- **Fiscal vs calendar frames.** The SEC frames API aligns facts to calendar windows with tolerances. Fiscal-year companies will not line up cleanly without your own period keys.
- **Units and scale.** USD vs USD-per-share vs shares; thousands vs millions in presentation vs XBRL’s actual values.

This is why a **concept resolver** is a core backend service, not a frontend convenience:

- Canonical concepts (`revenue`, `operating_income`, `net_income`, `total_assets`, `total_debt`, `cfo`, `capex`, `shares_diluted`, …)
- Ordered synonym sets, **period-scoped** (a tag only wins if it has an observation for that period)
- Industry-specific statement templates (corporate, bank, insurance, REIT, utility)
- Provenance on every served number: tag, accession, form, filed-at, direct vs derived
- Missing is missing. Never silently coerce a gap to zero.

Until that layer exists, screens, models, and AI will all be wrong in confident ways.

### 5.2 Entity resolution

Join keys you must own:

| Key | Source | Use |
| --- | --- | --- |
| CIK | SEC | Primary filer id |
| Ticker + exchange | SEC submissions, `company_tickers.json` | UX search; unstable over time |
| LEI | GLEIF (public) | Cross-source legal entity |
| EIN / tax id | Sometimes in filings | Corporate actions, subsidiaries |
| SIC / NAICS | SEC / Census | First-pass industry |
| Your peer-set id | You | Decision-useful grouping |

Tickers change. Companies merge. One issuer can have multiple CIKs over time. A `company` table with aliases and effective dates is mandatory.

### 5.3 Recommended data layout

A lakehouse / medallion layout fits this product:

**Bronze (immutable raw)**  
Source files exactly as received: zip, json, txt, plus fetch timestamp, etag/hash, user-agent identity, and HTTP status.

**Silver (parsed, still source-faithful)**  
- `sec_fact(cik, taxonomy, tag, unit, period_start, period_end, instant, value, accession, form, filed_at, segments, …)`  
- `sec_submission(...)`  
- `macro_observation(series_id, source, vintage_date, observation_date, value, copyright_class)`  
- `entity(...)`

**Gold (productized)**  
- `statement_line` — canonical line items by company/period  
- `ratio` and `quality_flag`  
- `peer_stat` — percentiles, z-scores, ranks  
- `company_pack` — denormalized profile payload  
- `overlay_pack` — macro series attached to a sector/company  
- Search documents and embedding pointers (for AI, later)

Keep gold tables **recomputable** from silver. Mapping rules will change; you will want to rebuild without re-hitting SEC.

### 5.4 Serving for “swift access”

Users do not want to scan billions of XBRL facts. They want:

- Company profile in < 200 ms
- Screener over the universe in 1–3 seconds
- Chart of 40 quarters of 8 line items instantly
- Export of a peer table to Excel
- (Later) a model or regression that may take seconds to minutes

That implies two query paths:

1. **OLTP / pack path** — Postgres (or similar) + Redis for `company_pack`, watchlists, auth, annotations.
2. **OLAP / screen path** — ClickHouse, DuckDB-on-Parquet, or a warehouse (BigQuery/Snowflake/Redshift) for cross-sectional screens, distributions, and panel pulls.

Filings text belongs in object storage + OpenSearch/Meilisearch, not in the facts table.

Materialize the expensive things:

- Latest-period standardized statements for all Tier A/B names
- Trailing-twelve-month (TTM) where constructible
- Peer percentile ranks
- Common screen columns (growth, margins, leverage, FCF, dilution)

Do **not** compute TTM and peer ranks in the request path for every page view.

### 5.5 Suggested service boundaries

| Service | Responsibility |
| --- | --- |
| Ingest workers | Source adapters, budgets, bronze writes |
| Mapping / resolver | XBRL → canonical statements |
| Entity service | Search, aliases, peer sets |
| Market API | Authz’d reads of gold tables |
| Job runner | Models, exports, econometric jobs, AI summaries |
| Alerting | Filing and threshold watches (query warehouse, not SEC) |
| Admin | Source health, mapping QA, copyright flags |

A modular monolith is enough for **ingest + resolver**. Serving must be designed horizontally from P0 (shared packs, cache, separate user store) so a large audience is a capacity change, not a rewrite. Split ingest from serving so a mapping rebuild cannot take down company pages.

---

## 6. Scale for a large user base

**1,500 users is an early operating point, not the design target.** The platform must serve many more — tens to hundreds of thousands of registered users, with a path beyond that if the product is public. User growth must not add a single SEC/BLS/BEA call.

Two planes scale differently:

| Plane | How it scales with users |
| --- | --- |
| **Ingest + gold warehouse** | Almost **constant**. One universe of filings and overlays. Same control plane, same 10 req/s SEC ceiling. |
| **Serving + private state** | **Linear to super-linear.** Sessions, watchlists, models, alerts, exports, AI. Filing-season thundering herds (everyone opens the same 10-K). |

Design the read path as a large multi-tenant product from P0: shared immutable packs, cache-first company pages, isolated jobs. Do not build a 1,500-analyst monolith and “add Kubernetes later.”

### 6.1 Load shape

Planning bands, not promises. Size the architecture so moving right is a capacity change, not a rewrite.

| Band | Registered users (order) | Concurrent sessions (busy) | What dominates |
| --- | --- | --- | --- |
| Early | thousands | hundreds | Mapping QA, pack correctness |
| Design target | tens–hundreds of thousands | thousands–tens of thousands | Cache hit rate, quotas, abuse |
| Beyond | larger public audience | market-open / filing spikes | Edge cache, read replicas, load shed |

Other load facts:

- Read QPS is high only if pages miss cache. A hot company pack is **identical for every user** at a given `as_of` / mapping version. That is the main scale lever.
- Heavy jobs (screens, exports, models, AI) are bursty and **do not share** the pack read path.
- Bots and scrapers will try to clone the warehouse. Treat unauthenticated and bulk-export traffic as hostile.
- Filing Friday: one NVDA/Apple 10-K can look like a DDoS if every session rebuilds facts.

### 6.2 Serving architecture (design for the large band)

**Must have from the start (even if traffic is still small)**

- Horizontal, autoscale **API/web only** — never autoscale ingest by adding IPs
- Shared **versioned company packs** as the unit of cache (CDN / edge + Redis)
- Fragment cache so a Form 4 does not invalidate the income statement
- Connection pooling; user/session store **partitioned by user id**, separate from gold
- Dedicated OLAP (or warehouse) for screens — not the OLTP primary
- API gateway: auth, per-user / per-IP / per-tier rate limits, WAF/bot controls
- Async job plane with global, per-tier, and per-user concurrency caps
- Load-shed flags: disable AI, export, and heavy screens before company pages
- Observability: cache hit rate, pack p95, queue depth, 429s **on your API**, source 403/429 (should stay ~0 from users)
- Backups and PITR on warehouse + user store

**Add as the audience grows (capacity, not new product)**

- Read replicas / multi-AZ for the user store and pack metadata
- Multi-region **read** of packs (replicate artifacts; ingest stays single-region, single identity)
- Notification fan-out (email/push) as its own system — not a loop in the API box
- Search cluster isolated from pack API
- Paid vs free tiers with hard quotas (AI, export, job minutes)

**Still do not do**

- Per-tenant physical warehouses of SEC data (the gold corpus is shared)
- Live-proxy “scale-out” to EDGAR
- Streaming-everything as a substitute for nightly bulk + incremental accessions

### 6.3 Multi-tenancy and product limits

Shared gold; private everything else: watchlists, models, notes, saved screens, alert rules, API keys. Isolate by `user_id` / `org_id` with row-level security. Teams will appear at large scale whether you plan for them or not — design org tenancy before you have tens of thousands of individuals.

Caps are a **product requirement**, not an infra nicety. At large N, a few users *will* try to download the warehouse and a few will fork-bomb the job queue.

| Cap | Why |
| --- | --- |
| Interactive screen row limit; export-as-job after that | Protect OLAP |
| Concurrent models / regressions per user and per tier | Protect workers |
| AI questions / tokens per day per tier | Cost and abuse |
| Export frequency and bytes | Scraping |
| Alert fan-out rate | Notification storms |
| Unauthenticated pack access | Decide public vs login-gated; cache accordingly |

Anonymous or SEO company pages, if you offer them, must be **pack-only** and heavily cached. They are the first thing that will be scraped.

### 6.4 Cost shape (order of magnitude, not a quote)

Shared warehouse cost grows with **coverage and mapping versions**, not with user count. What grows with users:

| Item | Why it grows |
| --- | --- |
| Edge/CDN + Redis | Pack hits at scale (cheap if hit rate is high) |
| User store | Watchlists, theses, models, sessions |
| Job minutes | Models, exports, custom screens |
| Search / embeddings | Only if P4 is on; cache per accession |
| LLM | Dominates the bill if unbounded; tier or it will exceed infra |
| Notifications | Filing alerts × large watchlists |
| Support / abuse ops | Bots, credential stuffing, ToS |

A fundamentals-only v1 with a few thousand companies can stay conventional **until** you turn on unbounded chat, full-universe notes, or free export of gold. Those are the cost cliffs, not “we added more logins.”

### 6.5 What does *not* change at large scale

- One ingest identity, ~5–8 SEC req/s, bulk first
- Users never hit source APIs
- Resolver and provenance rules
- Bronze replay instead of HTML crawl

If those break, more users only fail faster.

---

## 7. How the site should evolve

Build in capability layers. Each layer should be useful alone.

### Phase 0 — Trustworthy warehouse

- Ingest control plane and source adapters
- SEC bulk backfill + incremental accessions
- Entity table and ticker/CIK search
- Canonical mapping for a corporate template (not banks yet)
- Company page: statements, filing list, provenance
- Macro overlay of ~30 series from original agencies

**Exit test:** a human can reconcile a served revenue/net income figure to the filing, and ingest stays healthy through a 10-Q Friday.

### Phase 1 — Intelligence, not just data

- Peer sets (manual + rules)
- Screener on gold columns
- Quality flags (missing mapping, restatement, unit anomaly, fiscal mismatch)
- Watchlists and filing alerts (from your index, not live SEC)
- Sector dashboard: cohort medians vs macro overlay
- Excel/CSV export

**Exit test:** a user can go from “sector looks weak” to a shortlist of names with deteriorating TTM margins, with sources attached.

### Phase 2 — Decision tools

- User financial models on standardized statements
- Scenarios and sensitivity tables
- Saved theses / decision journal
- Basic statistics: ranks, z-scores, correlations, distributions
- Bank / REIT / insurer templates

### Phase 3 — AI and research workspace

- RAG over **your** filing text and structured facts
- Filing diffs and “what changed” briefs
- Assisted mapping of custom XBRL extensions (human-approved)
- Alert narratives

### Phase 4 — Econometrics and collaboration

- Job-based regressions / panel tools
- Vintage-aware backtests
- Shared workspaces, permissions, audit log
- Optional user API (reads **your** gold data only)
- Licensed market data for live multiples
- International filings (SEDAR+, Companies House, etc.) only after US coverage is trusted

Do not start with econometrics or a general-purpose AI chatbot. Those amplify whatever is wrong in mapping.

---

## 8. UI design that fits this product

This is a professional analysis tool. It should feel closer to a research terminal than to a consumer fintech dashboard — but it should not imitate Bloomberg’s 1990s density without hierarchy.

### 8.1 Design principles

1. **Density with progressive disclosure.** Tables and sparkline context first; narrative second.
2. **Provenance is visible.** Every number has a hover/source: tag, filing, date, as-filed vs restated.
3. **Compare is the default verb.** Company vs history, vs peers, vs macro. A single-company page that cannot compare is a database browser.
4. **Decision orientation.** Each major view should end in “so what”: watch, model, export, or note — not just a chart.
5. **Honesty about gaps.** Show “unmapped,” “bank template required,” “series copyright-restricted,” not a blank or a zero.
6. **Keyboard and export.** Analysts live in Excel and muscle memory. Filters, jump-to-ticker, copy table.
7. **Calm during filing season.** Prefetch company packs; do not spin on live government calls.

### 8.2 Information architecture

| Area | Purpose |
| --- | --- |
| **Home / briefing** | User watchlist changes, new filings, macro releases, alerts |
| **Company workspace** | Overview, statements, segments (when mapped), filings, peers, overlays, model |
| **Screener** | Universe → filters → saved views → export |
| **Sectors / themes** | Cohort + macro pairing (energy+EIA, banks+yield curve, etc.) |
| **Filings research** | Sectioned search, diffs, later AI brief |
| **Models** | Assumptions, scenarios, outputs, versions |
| **Lab (later)** | Stats and econometric jobs |
| **Data status** | Last successful ingest, coverage, known source outages |

A company workspace should be a persistent shell (ticker switcher, period toggle, as-filed/restated) with panes, not a stack of unrelated pages.

### 8.3 Visual language

- Neutral professional palette; dark theme is expected by this audience but must pass contrast
- Tabular typography (tabular lining figures), tight but readable row height
- Charts: few series, labeled units, recession/release markers, no decoration
- Status chips for mapping quality and data freshness
- Mobile: watchlist + alerts + company overview only. Modeling and screening are desktop-first.

### 8.4 What not to design

- A marketing landing page that pretends this is a consumer stock app
- Unsourced AI summaries above the statements
- A “terminal” of raw XBRL tags as the primary UX
- Infinite customizable widgets before the core company/screener loop is excellent

---

## 9. Role of AI

AI is a **research assistant over a trusted warehouse**, not a data source and not a black-box scoring oracle.

### 9.1 High-value uses

| Use | Why it belongs |
| --- | --- |
| Filing Q&A with citations | 10-Ks are long; users want section-grounded answers |
| “What changed” between 10-Q periods | Diff narrative + structured deltas |
| Mapping suggestions for custom tags | Humans approve; AI proposes |
| Alert copy | Turn a threshold breach into a readable brief |
| Query translation | “Show me levered names losing FCF” → screener AST |
| Model commentary | Explain which assumption dominates a DCF — after the model ran on structured data |

### 9.2 Hard constraints

- **Numbers come from gold tables.** If the model cannot cite a stored fact, it must refuse the figure.
- **Do not train foundation models on FRED content** (and treat other sources’ terms the same way).
- **Do not send raw third-party copyrighted series to a training pipeline.**
- Retrieval must be scoped to the company’s filings + user-visible facts, with accession links.
- Hallucinated CIKs, dates, and “revenue was $X” are product-breaking. Prefer tool-calling into your API.
- Keep a human mapping-approval step for anything that changes served financials.

### 9.3 Architecture sketch

```text
User question
    → retrieve structured facts (SQL/API)
    → retrieve filing chunks (search + embeddings on your text)
    → LLM with tools + citation requirement
    → answer with links to accessions and table cells
```

Run this asynchronously for long briefs. Cap context. Cache embeddings **per accession** so you never re-embed a filing.

### 9.4 What to delay

- Autonomous investment recommendations
- Unsupervised peer scoring
- Training your own market LLM
- Voice/chat as the primary UI

AI multiplies trust. Ship it after provenance and mapping are boringly reliable.

---

## 10. Financial modeling — how possible, and how

**Possible and valuable.** This is a natural Phase 2, not a science project.

What users expect:

- Three-statement or at least income + cash / simplified BS models
- Driver-based forecasts (growth, margin, NWC, capex, tax)
- DCF / reverse DCF / simple comps
- Scenarios and sensitivity (growth × WACC, etc.)
- Versioning and export to Excel

What makes it possible:

- Gold standardized statements as the **actuals spine**
- A model object: assumptions, period grid, formulas, outputs
- Deterministic calculation in your job runner (Python or a formula engine)
- No LLM in the calculate path

What makes it hard:

- Garbage actuals → garbage models (banks, negative equity, mid-year fiscal, discontinued ops)
- Users will want to override line items; store overrides without destroying source facts
- Circular references (interest, cash) need an iterative solver
- You will be compared to Excel. Export quality matters more than a fancy chart.

Recommended path:

1. Corporate template only, annual + TTM, 5-year forecast, DCF + comps.
2. User can lock any actual line to a manual value (audit trail).
3. Later: quarterly models, banks, LBO, Monte Carlo on the same engine.

Do not generate models from free-text 10-Ks. Use structured actuals; use AI only to propose driver notes.

Regulatory note: once the product looks like advice to many users, you need a compliance review (disclaimers are not a strategy). Modeling tools for professionals are common; “the platform says buy” is a different product.

---

## 11. Financial statistical data — how possible, and how

**Highly possible in Phase 1–2.** This is mostly warehouse math.

Ship early:

- Growth: QoQ, YoY, 3y/5y CAGR, TTM
- Levels and margins; basis-point changes
- Peer percentile ranks and z-scores
- Simple distributions (histogram / box of a sector metric)
- Correlation of a company’s growth vs a macro series (descriptive, not causal)
- Coverage statistics (how many peers have the line mapped)

Ship carefully:

- Winsorization and outlier flags (tiny denominators, first-year IPOs, units errors)
- Fiscal-period alignment before any cross-section
- Separate “as-filed” and “restated” statistical universes

This layer is what turns a database into intelligence. It does not require a statistics PhD, but it does require period alignment and mapping QA.

---

## 12. Econometric tools — how possible, and how

**Possible as a later, isolated compute plane.** Do not embed a live OLS engine in the company-page request path.

### 12.1 What is realistic

| Capability | Fit |
| --- | --- |
| OLS / WLS of a metric on macro factors | Good first lab feature |
| Panel regressions with entity/time effects | Good, needs balanced-panel tooling |
| HAC / clustered standard errors | Expected by serious users |
| VAR / VECM on a small macro set | Feasible; easy to misuse |
| Event studies around filings | High product value if dated correctly |
| Cointegration / structural models | Research users only |
| Full Stata/EViews replacement | Do not attempt |

Implementation pattern:

- User picks Y, X, universe, frequency, date range, vintage policy
- Job runner uses **statsmodels / linearmodels** (or an R/Julia worker) on a **snapshot extract**
- Results stored: coefficients, diagnostics, residual plots, formula, data hash
- UI shows methodology and warnings (N too small, unit roots, look-ahead)

### 12.2 The econometric landmines

- **Look-ahead from revisions.** GDP and payrolls are revised. If you want honest backtests, you need vintages (ALFRED or your own capture of first-print releases).
- **Mixed frequency.** Quarterly filings vs monthly CPI vs daily rates. Be explicit about aggregation.
- **Survivorship.** Today’s S&P-like universe is the wrong history.
- **Multiple testing.** A screener + a regression studio will p-hack itself. Show holdout or at least warn.
- **Compute isolation.** A careless panel on thousands of names can exhaust a box. Quotas and extracts are mandatory.

Econometrics is a differentiator for a serious intelligence product and a reputation risk if it is a toy. Phase 4 is the right time.

---

## 13. Recommended technical starting shape

A concrete, boring stack that matches the constraints:

| Layer | Sensible default | Why |
| --- | --- | --- |
| Ingest | Python workers + scheduler (or Temporal) | Best library support for these APIs |
| Bronze | S3/GCS + hashed keys | Immutable raw |
| Silver/gold OLTP | Postgres | Entities, packs, users, models |
| OLAP | ClickHouse or warehouse + Parquet | Screens and stats |
| Cache | Redis | Packs, rate limits |
| Search | OpenSearch | Filings |
| Jobs | Queue + workers | Models, AI, exports |
| API | Authenticated REST/JSON; later BFF | Simple for a dense UI |
| UI | React/Next (or similar) + a serious table/grid | Desktop-first research UX |
| Auth | OIDC + org tenancy from the start | A large audience will include teams and scrapers |
| Observability | Metrics + traces + source-budget dashboards | Flagging prevention |

Alternatives are fine. The architecture above is chosen because it keeps ingest, mapping, and serving separable.

---

## 14. Legal, compliance, and product risk

- **SEC DERA disclaimer:** extracts can be wrong; they are not a substitute for the filing. Your UI should say the same and link to the accession.
- **Attribution:** BLS, BEA, Census, Treasury, EIA, and FRED all expect source citation. Store citation text with the series.
- **FRED/third-party copyright and AI-training prohibitions** — see §3.3.
- **Not investment advice** in the product and in the company legal posture.
- **If you charge and recommend:** securities / RIA questions appear. Get counsel before “signals.”
- **User-generated models and notes** are customer data; backup, deletion, and org isolation matter more as the audience grows.
- **Security:** this is not PCI, but watchlists and models are sensitive. SSO, audit logs, and no leaked source API keys in the browser.

---

## 15. What would actually get you flagged (checklist)

Do these, and you are designing for a block:

- [ ] Browser or mobile clients calling `data.sec.gov` directly
- [ ] One HTTP handler that fetches companyfacts on cache miss
- [ ] Horizontal ingest “scale-out” across many IPs
- [ ] Default `python-requests/2.x` or `Go-http-client` user-agents
- [ ] Recrawling all exhibits every night
- [ ] Polling BLS/BEA every few minutes
- [ ] Scraping FRED HTML or training a model on a FRED dump
- [ ] Retrying 403/429 immediately at full rate

Do these, and you are aligned with how the agencies ask to be used:

- [ ] Bulk files first; API second; HTML almost never
- [ ] One identified, budgeted ingest plane
- [ ] Accession-level caching
- [ ] Release calendars
- [ ] User traffic served from gold tables
- [ ] Backoff, jitter, and a human-readable source-health page

---

## 16. Open product decisions

These are not technical blockers, but they change the build:

1. **Universe:** US operating companies only, or funds / ADRs / foreign private issuers from day one?
2. **Prices:** stay filing-based until a vendor is signed, or is valuation-without-price acceptable for v1?
3. **Commercial posture:** research tool vs advice product (drives compliance and AI copy).
4. **FRED vs original agencies** for the first macro overlay.
5. **Bank coverage in v1.** Including banks without a bank template will make the product look broken.
6. **Team vs individual vs public/SEO pages** — tenancy and cache policy for a large audience.

---

## 17. Suggested first build (narrow)

A first system that proves the architecture:

1. Ingest control plane with SEC bulk + 30 macro series from Treasury/BLS/BEA.
2. Resolver for ~20 corporate line items with provenance.
3. Company workspace + screener + watchlist alerts.
4. Pairing: each sector page shows 3–5 relevant macro series next to cohort medians.
5. Data-status admin and source budgets.

That is already a market-intelligence platform. Modeling, AI, statistics depth, and econometrics should attach to that spine — not the other way around.

---

## 18. References (official starting points)

- https://www.sec.gov/about/developer-resources
- https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- https://www.sec.gov/data-research/sec-markets-data/financial-statement-data-sets
- https://www.sec.gov/data-research/sec-markets-data/financial-statement-notes-data-sets
- https://www.sec.gov/files/financial-statement-data-sets.pdf
- https://fred.stlouisfed.org/legal/terms/
- https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf
- https://www.bls.gov/bls/api_features.htm
- https://www.census.gov/data/developers/guidance/api-user-guide/query-components.html
- https://fiscaldata.treasury.gov/api-documentation/
- https://www.eia.gov/opendata/documentation.php
- https://api.data.gov/

---

## 19. What would further enhance the platform

The first build in §17 is a trustworthy fundamentals product. These enhancements are what turn that into a platform people stay in — ranked by how much they improve **decisions**, not by how impressive they sound.

Do not add all of this. Each item below assumes the warehouse, resolver, and “users never hit source APIs” rule already exist.

### 19.1 Highest leverage (still mostly public data)

**1. An event layer, not just statements**

10-K/10-Q facts are the spine. Intelligence is often in *what happened between quarters*:

| Event | Source | Why it changes decisions |
| --- | --- | --- |
| Material events | 8-K **item codes** (2.02 earnings, 2.05/2.06 impairments, 1.01 agreements, 5.02 officer changes, 4.02 non-reliance) | Same-day context; do not treat every 8-K as equal |
| Insider activity | Forms 3/4/5 | Clustered open-market buys ≠ option grants or tax withholdings (`transactionCode`) |
| Institutional ownership | 13F-HR (+ amendments) | Crowding, new/exited names; 45-day lag is a feature you must label |
| Activist / large stakes | SC 13D / 13G | Control and campaign risk |
| Restatements and amendments | 10-K/A, 10-Q/A, 8-K item 4.02 | The difference between “as we knew it” and “as it is now” |
| Auditor / ICFR | 10-K auditor, material weakness, later-filed correspondence | Quality of the numbers themselves |

Parse these from **daily `form.idx` / `master.idx`**, then fetch only new accessions. Amendments (`4/A`, `13F-HR/A`) are a first-class data problem: decide whether they replace, extend, or sit beside the original.

**2. A company knowledge graph**

Join keys are not enough. Enhance `entity` into a graph:

- Issuer ↔ securities ↔ CIK history ↔ LEI (GLEIF is public)
- Officers/directors (DEF 14A, Form 4 reporting owners)
- Subsidiaries and former names
- Mentioned counterparties, customers, and suppliers extracted from MD&A (search, not a live crawl)
- Federal contract awards via USAspending (demand overlay for defense, IT, health)

This is what lets a user click from a margin miss to “three customers cut in the 10-K” or “the CFO sold stock the same week.”

**3. As-of time machine in the product UI**

Every company page and screen should toggle:

- **Latest restated** (how the company looks today)
- **As-of date T** (what a diligent reader could have known on T)

Without this, models, stats, and econometrics will silently cheat. With it, the platform becomes a research tool instead of a revised-history browser. See §20.1 for the backend primitive.

**4. Filing diffs and “what changed”**

Structured deltas (mapped lines vs prior period and vs year-ago) plus section diffs (MD&A, risk factors, liquidity). This is the feature users will open every earnings morning. AI can narrate it **after** the structured delta exists.

**5. Industry statement templates and operating KPIs**

A second corporate template is not an enhancement; **templates per industry** are:

- Banks: NII, NIM, provision, NPL / NCO, CET1 — not “revenue”
- Insurers: premiums, combined ratio concepts where tagged
- REITs: FFO-like constructs only when you can defend the derivation
- Energy: production / realized price overlays from EIA + company segments
- Software: remaining performance obligations and deferred revenue when tagged

Unmapped industry KPIs should show as gaps, not invented totals.

**6. Decision workflow**

Data without a place to decide gets exported to Excel and never comes back.

- Dated thesis / decision journal linked to specific facts and accessions
- Shared team workspaces, comments on table cells
- Composite alerts: “10-Q filed AND TTM FCF down AND clustered Form 4 sales AND 8-K 2.02”
- One-click “decision pack” (PDF/Excel): statements, peers, overlay, events, sources

This is how a large audience becomes a product rather than a crowd of one-off browsers.

**7. Quality and forensic flags (explainable)**

Not a secret “fraud score.” Explicit, documented checks:

- Balance-sheet identity residual after mapping
- Dual-tagged revenue (same period, two tags, same or different values)
- Accruals vs cash (net income − CFO) extremes vs peers
- Share-count jumps, dilutive issuance, buyback authorization vs actual treasury
- Sudden auditor change, late filer, NT 10-K/10-Q
- Mapping confidence and coverage % for this company/period

Users trust flags they can open. They do not trust an opaque grade.

### 19.2 High leverage once the spine is trusted

**8. Licensed market data (when you need multiples)**

Prices, splits, and consensus estimates are the main *commercial* enhancement. They unlock EV, yield, surprise, and live comps. Until then, stay honest: “filing-based,” not “cheap.”

**9. Transcripts and earnings releases**

8-K exhibits and later paid transcript feeds. Pair the **release** (item 2.02) with the **later 10-Q** to show guidance language vs subsequent actuals.

**10. Notes and dimensions**

DERA notes datasets and XBRL dimensions unlock segments, geographic revenue, and footnote search. This is how “the company” becomes “the business lines.” It is also how storage and mapping cost jump.

**11. International filers**

SEDAR+, Companies House, ESSEF/ESEF. Only after US mapping QA is boring. Entity resolution gets harder, not easier.

**12. User API and semantic metrics**

A read API over **gold** metrics (not raw tags) so power users and internal tools share one definition of TTM FCF. This is also what makes AI tool-calling safe.

### 19.3 What looks like an enhancement but often is not

| Tempting add | Why to wait |
| --- | --- |
| General chatbot on day one | Hallucinates numbers; trains users to distrust you |
| Clone of FRED or a wholesale macro warehouse | Terms, copyright, and you still need original agencies |
| Autonomous buy/sell signals | Compliance change, not a feature |
| Every EDGAR form type | Noise; coverage tiers exist for a reason |
| Training your own market LLM | Cost + legal; retrieval over your warehouse is enough |
| Real-time tick UI | Different product; different vendor contracts |

---

## 20. What would further enhance the backend

The first backend is “bulk ingest + resolver + packs.” These are the upgrades that make that backend **correct under restatement**, **fast under filing season**, and **safe to attach models/AI to**.

### 20.1 Point-in-time as a query primitive (the single biggest backend upgrade)

Store facts bi-temporally:

| Clock | Meaning |
| --- | --- |
| `period_end` / `instant` | The economic period the number is about |
| `filed_at` / `accepted_at` | When the market could have known it |
| `superseded_at` | When a later filing restated it (null if current) |

Every serving path — company pack, screener, model actuals, stats, econometrics, AI tools — should accept `as_of`. Implementation pattern: keep both **original** and **latest** values; never overwrite bronze.

This is also the feature-store contract if you later train models: joins must be `filed_at <= as_of`, never “latest revenue for FY2022.”

### 20.2 Semantic layer (one definition, every consumer)

Define metrics once (`revenue`, `ttm_fcf`, `net_debt`, `roic`) with:

- Formula
- Industry template
- Unit and scale
- Required provenance
- Known failure modes (banks, negative equity, 53-week years)

UI, Excel export, user API, model engine, and LLM tools all call this layer. If “FCF” is re-derived in four codepaths, the platform will disagree with itself.

Treat mapping rules as **versioned code** (dbt seeds, YAML synonym sets). Deploy mapping changes like software: golden tests on known 10-Ks, canary on a sector, then rebuild gold from silver without re-hitting the SEC.

### 20.3 XBRL calculation and presentation linkbases

Companyfacts tags are not enough for a serious resolver.

- **Presentation** (`PRE` / linkbase): order and labels as the filer showed them — needed to reconstruct a statement a human recognizes.
- **Calculation**: parent/child roll-ups, including how a custom extension rolls into a standard total. This is how you detect double-counting and recover extensions that a synonym list will miss.

Add identity tests as warehouse assertions: assets ≈ liabilities + equity; cash roll-forward; dual-tag revenue dedup. Failures become mapping tickets, not silent screen results.

### 20.4 Event-driven gold, not nightly-only

Nightly bulk is the safety net. Enhancement:

```text
daily index / Atom
    → new accession (deduped)
    → fetch once, store bronze
    → parse → silver
    → remap affected (cik, periods)
    → rebuild company_pack + peer_stat fragments
    → evaluate alert rules
    → invalidate caches by pack version
```

Users opening a name at 4:20 p.m. on a 10-K day should see **your** processed pack, not a spinner that calls EDGAR.

Priority queues: Tier A watchlist names first, then the rest. Still one requester identity; priority is **ordering**, not more IPs.

### 20.5 Lineage, contracts, and freshness SLIs

For every gold cell, store enough lineage to answer “which accession and which mapping version produced this?”

Operate the ingest plane like a product:

| SLI | Why |
| --- | --- |
| Source 429/403 rate | Flagging risk |
| Budget remaining (BLS daily, BEA per-minute, SEC req/s) | Stay polite |
| Time from EDGAR disseminate → pack available (Tier A) | Filing-season promise |
| Mapping coverage % by template | Product honesty |
| Identity-test fail count | Silent corruption |
| Bronze checksum / replay success | You can rebuild without the source |

Dead-letter queues + replay from bronze are mandatory. If a zip is bad, you must not “fix” it by recrawling HTML.

### 20.6 Serving architecture upgrades (swift access at large scale)

| Upgrade | Effect |
| --- | --- |
| **Versioned company packs** | Immutable JSON/Parquet artifact per `(cik, as_of, mapping_version)` |
| **Fragment cache** | Statements, peers, overlay, events cached separately; a new Form 4 does not rebuild the income statement |
| **Result cache keyed by input hash** | Same screen / same as_of is free |
| **CQRS** | Writes (ingest, mapping rebuild) never contend with pack reads |
| **OLAP store** (ClickHouse / warehouse / Iceberg) | Screens and percentiles stay off Postgres |
| **Hot/cold tiers** | Latest 8–12 quarters hot; deep history in Parquet |
| **Fiscal calendar service** | 52/53-week years, FY changes, mid-year IPOs — a shared library, not ad hoc SQL |

Table format (Iceberg/Delta) helps **time travel and rebuilds**. It does not replace the `as_of` semantic; it just makes silver/gold reproducible.

### 20.7 Search backend that matches how filings are written

Chunk 10-K/10-Q by **item boundaries** (Item 1A, Item 7, Item 8 notes), then sliding windows inside the item. Hybrid retrieval: BM25 for rare phrases (“going concern,” a customer name) plus embeddings for paraphrase.

Index metadata on every chunk: cik, accession, item, filed_at. AI retrieval must filter `filed_at <= as_of` the same way facts do.

Do not embed a filing twice. Cache embeddings **per accession**.

### 20.8 Ingest control plane upgrades

Beyond a token bucket:

- Per-source adapters with a shared **budget object** (rps, daily count, error budget)
- Jittered backoff and a circuit breaker that **pages humans** instead of retrying into a block
- Watermarks: “daily index for 2026-08-22 fully consumed”
- Synthetic probes (one cheap, identified request) so you know a 403 is you vs EDGAR
- Calendar-aware schedulers (do not poll BLS hourly)
- Idempotent load keys: `(source, accession or series, content_hash)`

`submissions.zip` is a batch-engineering problem (hundreds of thousands of JSON files). Stream-extract into object storage; do not unpack a 500k-file directory onto one disk.

### 20.9 Compute plane for models, stats, and econometrics

Enhancement is **isolation**, not a bigger API box:

- Snapshot extracts (narrow, dated, hashed) into the job
- Concurrency caps per user and global
- Stored methodology: formula, universe, `as_of`, mapping version, data hash
- Optional feature store later — only if you already have PIT joins

The model engine should import **semantic metrics**, not raw tags.

### 20.10 Human mapping operations (the unglamorous upgrade)

The backend is incomplete without an internal tool:

- Queue of unmapped extension tags, dual tags, identity failures
- Suggested synonym (rules first, LLM second)
- Approve → new mapping version → gold rebuild
- Per-company “why this revenue tag won” debugger

This is how mapping quality compounds. Without it, the resolver rots after the first FASB taxonomy update.

### 20.11 Security and tenancy (a large audience includes teams and abuse)

- OIDC; SCIM when selling to firms
- Org + user row-level isolation for theses, models, alerts
- Audit log of who exported what (scraping shows up here)
- WAF / bot controls on pack and export endpoints
- Source API keys never in the browser; rotate BEA/BLS/EIA/FRED keys
- Separate job IAM from the public API role
- Per-tier quotas before the user count is large — they are harder to retrofit

### 20.12 Suggested backend enhancement order

1. Bi-temporal facts + `as_of` on every read path  
2. Semantic metrics + mapping-as-code with golden tests  
3. Event ingest (8-K items, Form 4, 13F) on the same control plane  
4. Event-driven pack rebuild + fragment cache  
5. Lineage / SLIs / replay from bronze  
6. Item-chunked filing search  
7. Linkbase-aware resolver + identity tests + mapping ops UI  
8. Isolated compute snapshots for models and econometrics  

Items 1–4 change product quality immediately. Items 5–8 are what keep you from being flagged, wrong, or slow once the user base is real.

The sequenced project map, process map, and build plan are in [BUILD_PLAN.md](./BUILD_PLAN.md). The collated implementer / AI instruction set is [AI_GUIDE.md](./AI_GUIDE.md).

---

## 21. Alignment with the product / backend briefs

An internal product definition and backend investigation brief were compared to this plan. **Those files were not modified.** Where the briefs were stronger on product, this repo adopted the change. Where this plan was stronger on ingest, legal, point-in-time, and serving, it was kept.

**Kept (this plan remains the rule)**

- Users never hit upstream APIs; one ingest identity; bulk-first SEC; no IP fan-out
- FRED is not a training corpus and not a wholesale mirror
- Bi-temporal `as_of` before models, stats, AI, and econometrics
- Mapping-as-code, identity tests, missing ≠ zero, bank templates
- Large-audience serving via shared packs and quotas
- AI after deterministic tools exist; no LLM arithmetic

**Adopted from the briefs**

- Journey: COMPANY → CHANGE → EXPLANATION → EVIDENCE → CONNECTIONS
- Layer 2 intelligence engine (explainable signals, precompute on filing arrival)
- Trust labels: Observed / Calculated / Model / Interpretation
- Curated sector driver maps (plausible mechanism vs correlation)
- Source-governance registry and source tiers (MVP vs later)
- Resolver: YTD vs quarterly, dimensions, mapping confidence
- First demo: 2–3 industries, 10–20 rules — not a huge shallow universe
- Postgres + object storage + Redis + pgvector first; graph DB and ClickHouse only when needed
- Version 1 complete when change + peers + drivers + tool-using AI + evidence all work
- Feature filter before new APIs or UI modules
