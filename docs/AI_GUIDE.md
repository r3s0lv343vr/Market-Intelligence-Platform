# Market Intelligence Platform — AI Guide

**Product:** Trace Market Intelligence. **Ingest identity:** `TraceMI/0.1 (Trace Market Intelligence; tracemarketintelligence@gmail.com)`. Nightly bulk ingest is a timer (3:30 a.m. US Eastern). The website never downloads EDGAR. Users keep the current pack until they refresh or change pages.

**Read this first** before writing code, designing a feature, or calling a government API.

This guide collates the investigation, enhancement paths, project map, process map, and gated build plan into one instruction set for humans and coding agents.

| Detail | Document |
| --- | --- |
| Why these constraints exist | [MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md](./MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md) |
| Workstreams, processes, phase work packages | [BUILD_PLAN.md](./BUILD_PLAN.md) |
| Intelligence core (Lattice) decisions | [INTELLIGENCE_CORE_DECISIONS.md](./INTELLIGENCE_CORE_DECISIONS.md) — **deferred until the end of this gated build**; do not implement in P0–P4 |
| Economic data agility (complements Lattice) | [ECONOMIC_DATA_AGILITY.md](./ECONOMIC_DATA_AGILITY.md) — **parked**; confirmation / scoring / substitution later; not a second product; do not implement in P0–P4 |
| Trade / logistics / disruption | [TRADE_LOGISTICS_DISRUPTION.md](./TRADE_LOGISTICS_DISRUPTION.md) — **parked as P6**; do not implement in P0–P4 |
| Where live SEC ingest will run | [INGEST_WORKER_HOST.md](./INGEST_WORKER_HOST.md) — not Vercel, not this cloud agent |

This product is **not investment advice**. Extracts are not a substitute for the filing. Rate limits and terms change; re-verify official pages before production.

---

## 1. What you are building

An AI-powered **research** platform: company financials + SEC filings + economic data, assembled so a user can see **what changed, why it may be happening, who else is affected, and what evidence to inspect**. The shortest promise: do not just show the numbers; explain what is driving them.

The product is **joins across sources that were never designed to be joined** — not a filing dump, not a quote app, and not a Bloomberg clone.

**User journey (governs V1 scope)**

```text
COMPANY → CHANGE → EXPLANATION → EVIDENCE → CONNECTIONS
```

A feature belongs in Version 1 only if it materially improves one of those steps. See §16.

**Three layers (do not confuse them)**

| Layer | What it is | What it is not |
| --- | --- | --- |
| 1 Data infrastructure | Ingest, bronze/silver/gold, provenance | The product users pay for |
| 2 Intelligence engine | Signals, peers, anomalies, curated drivers, relationships | Raw ratios dumped on a page |
| 3 Research experience | Change-first company page, filings, peers, drivers, scanner, tool-using AI | A generic chatbot or terminal of tables |

**Backend principle**

```text
Collect once → normalize → store → calculate → cache → serve many
Sources → ingest → bronze → silver → gold → intelligence → cache → API
                                                                    ↓
                                                          many users (never call SEC)
```

---

## 2. Hard rules (do not violate)

If a request conflicts with these, follow the rules and say so.

1. **User traffic never hits source APIs.** Browser, mobile, product API handlers, and user jobs must not call `data.sec.gov`, BLS, BEA, Census, Treasury, EIA, FRED, or similar. They read the warehouse.
2. **One ingest identity per source.** The SEC counts **10 req/s per requester across all machines**. Do not add IPs to “scale” ingest. Target ~5–8 SEC req/s.
3. **Bulk first.** Nightly `companyfacts.zip` and `submissions.zip`; DERA quarterly face financials for backfill. Per-CIK JSON only for new accessions you do not have.
4. **Identify automated traffic.** Descriptive `User-Agent` with organization name and a real contact email. Default library user-agents get `403`.
5. **Cache by accession.** A disseminated filing does not change. Do not refetch because a user reloaded a page.
6. **Bronze is immutable.** Fixes are a new mapping version + rebuild from silver. Never “fix” a bad zip by crawling HTML.
7. **Missing is missing.** Never coerce a gap to zero. Banks without a bank template are unmapped, not fake “revenue.”
8. **Provenance on every served number.** Tag, accession, form, filed-at, as-filed vs restated, mapping version, **mapping confidence**. Never visually conflate **observed fact**, **calculated measure**, **model output**, and **interpretation**.
9. **Deterministic math in code.** LLMs must not compute YoY, TTM, FCF, or ranks. AI synthesizes an **evidence package** the backend already built. If the model cannot cite a stored fact, it refuses the figure. Do not train on FRED content.
10. **No extra source calls to look busy.** No polling BLS/BEA every few minutes. Honor release calendars.
11. **Do not start P4/P5/P6 to look advanced.** Chat, econometrics, disruption maps, and buy/sell signals amplify wrong mapping.
12. **This is not an advice engine.** No autonomous “buy/sell.” Modeling tools are fine; recommendations are a compliance change.
13. **Design serving for a large audience.** 1,500 users is an early cohort, not the ceiling. Shared packs, quotas, and a partitioned user store from P0. User growth never changes ingest.
14. **Source-governance registry.** Every connector has keys, limits, attribution, license class, and update calendar. Do not assume identical commercial-use or redistribution rights.
15. **Precompute on arrival, not on page view.** New 10-Q → parse → normalize → metrics → signals → peers → cache. Thousands of users read the result.

### Behaviors that get the platform flagged

| Do not | Do |
| --- | --- |
| Browser/client calling `data.sec.gov` | Product API → gold/packs |
| Fetch companyfacts on cache miss in a user request | Pack rebuild from ingest |
| Horizontal ingest across many IPs | One control plane, priority queues |
| `python-requests/2.x` / generic User-Agent | `TraceMI/0.1 (Trace Market Intelligence; tracemarketintelligence@gmail.com)` |
| Recrawl all exhibits every night | Accession-level cache |
| Immediate retry on 403/429 | Circuit breaker, page humans, replay bronze |
| Scrape FRED HTML / train an LLM on FRED | Curated original-agency series + citations |

---

## 3. Source constraints (ingest only)

| Source | How to pull | Limits / terms (verify live) | Role |
| --- | --- | --- | --- |
| **SEC** | Bulk zips nightly ~3:00 a.m. ET; daily `master.idx` / `form.idx`; Atom for new forms; DERA quarterly `SUB`/`NUM`/`PRE`/`TAG` | 10 req/s per requester, all machines; User-Agent required; IP block on abuse | Company financials + filings |
| **Treasury Fiscal Data** | Filtered GET, public domain | Prefer bulk-friendly filters | Debt, DTS, MTS, auctions, curve |
| **BLS** | API 2.0, registered | 500 queries/day, ≤50 series/request, ≤20 years | CPI, jobs, PPI, wages |
| **BEA** | Registered UserID | 100 req/min and/or 100 MB/min and/or 30 errors/min | GDP, PCE, industry accounts |
| **Census** | Key recommended | 500 queries/IP/day without key | Industry / geo context |
| **EIA** | Required key | Throttle; temp key suspend; ~5k rows/call | Energy overlay |
| **FDIC / FFIEC** | Public APIs or bulk | Agency-specific | Banks |
| **Fed / NY Fed** | Original publications (H.15, NY Fed markets) preferred over a FRED mirror | Agency-specific; still one ingest identity | Rates, credit, funding (MVP driver layer) |
| **FRED** | Small curated overlay only if needed | ~120 req/min typical; **no AI/ML training**; no FRED-clone UX; per-series copyright | Convenience — prefer original agencies |

**Source tiers (do not ingest the world in P0)**

| Tier | Sources | When |
| --- | --- | --- |
| MVP | SEC, BLS, BEA, EIA, Census, Fed/NY Fed, Treasury (rates/fiscal as needed) | P0–P1 |
| Phase 2 | FINRA, FDIC, USAspending, remaining Treasury | After company workflow is trusted |
| Phase 3 | World Bank, IMF, OECD, ECB | After US coverage is boring |
| Specialized | USPTO, sector government sets | Vertical need |
| Licensed later | Prices, consensus, transcripts, premium news | Contract signed |

**Pairing (product concept, not an afterthought)**

| Question | Pair |
| --- | --- |
| Company vs cycle | SEC + BEA/BLS + Treasury rates |
| Energy / utilities / chemicals | SEC cohort + EIA |
| Banks | SEC + FDIC/FFIEC + yield curve |
| Honest backtests | As-filed SEC + first-print / vintage macro |

Coverage tiers: **A** watchlist/operating names (incremental + nightly), **B** peer stats (bulk), **C** funds/other (on demand). Do not ingest every EDGAR filer in P0.

---

## 4. Architecture you must implement

```text
                    source adapters (never user-facing)
                              │ rate-limited, identified
                              ▼
                    ingest control plane
                    (calendars, token buckets, backoff, lineage)
                              ▼
                    bronze  immutable raw zip/json/txt
                              ▼
                    silver  parsed facts, series, entities
                              ▼
                    gold    standardized statements, events, metrics
                              ▼
                    packs + cache + product API     ── large user base
                    jobs (alerts, models, exports, later AI)
```

**Semantic clocks on every fact (required from P2; design in P0)**

| Clock | Meaning |
| --- | --- |
| `period_end` / `instant` | What the number is about |
| `filed_at` / `accepted_at` | When the market could know it |
| `superseded_at` | When a later filing restated it |

Every read path eventually accepts `as_of`. Latest-restated vs as-of-T is a product toggle, not a one-off query.

**Resolver (core backend, not a frontend convenience)**

- Canonical concepts (`revenue`, `operating_income`, `net_income`, `total_assets`, `total_debt`, `cfo`, `capex`, …)
- Ordered synonym sets; a tag **only wins if it has an observation for that period** (stale 2010 `Revenues` must not answer FY2025)
- Distinguish **duration quarterly vs YTD vs annual**; do not mix them in YoY/TTM without a rule
- Preserve XBRL **dimensions** (segments, geo) on the fact; do not drop them at ingest
- Store `mapping_confidence` and `transformation_version` on every gold line
- Industry templates: corporate vs bank vs insurer vs REIT vs utility
- Provenance: tag, accession, form, filed-at, direct vs derived
- Dual-tagged revenue: dedupe, do not double-count
- Identity tests: assets ≈ L+E; failures → mapping tickets

XBRL is a shared dictionary filers do not use the same way. There is no universal revenue tag. `Revenues`, `SalesRevenueNet`, `RevenueFromContractWithCustomerExcludingAssessedTax` all appear. Custom extensions are invisible to a fixed list. Presentation/calculation linkbases (P3+) recover extensions and statement order.

**Serving for a large user base (1,500 is only an early cohort)**

- User growth must not add source API calls. Ingest stays one identity.
- Shared **versioned company packs** — identical for every user at a given `as_of` / mapping version; CDN + Redis
- Pack path for company profiles; OLAP path for screens; user/org store **separate and partitioned**
- Filings in object storage + search (P4)
- Materialize TTM, peer ranks, screen columns — do not compute on every page view
- Caps and tiers: screen rows, export rate, job concurrency, AI questions — mandatory before the audience is large
- Autoscale API/web only. Never autoscale ingest by adding IPs
- WAF/bot controls; load-shed AI/export before company pages
- Writes (ingest, remap) must not share the hot read path

**Suggested layout**

```text
apps/web          desktop-first research UI
apps/admin        mapping queue, source health
services/ingest   adapters, budgets     NEVER user-facing
services/resolver mapping + semantic metrics
services/api      authenticated gold reads
services/jobs     alerts, packs, models, exports
services/search   filing index (P4)
warehouse/        bronze, silver, gold, mappings/
packages/         fiscal-calendar, provenance, contracts
```

A modular monolith is enough through P2. Split ingest from serving in P0.

---

## 5. Project map (what owns what)

| ID | Workstream | Owns | Must not own |
| --- | --- | --- | --- |
| 0 | Foundation | Repo, CI, secrets, logs, deploy skeleton | Product features |
| A | Ingest | Adapters, budgets, bronze, watermarks | User HTTP handlers |
| B | Warehouse | Schemas, loads, rebuilds from bronze | Live API calls |
| C | Entity | CIK, tickers, tiers, peers | XBRL math |
| D | Resolver | Synonyms, templates, `as_of`, metrics | UI layout |
| E | Serving | Packs, cache, product API | Source fetches |
| F | Product | Workspace, screener, alerts, export | Mapping rules |
| G | Ops | SLIs, mapping queue, source health | End-user research UX |
| H | Extensions | Events, models, AI, econometrics | Extra IPs / new ingest identities |

Critical path: **budget plane → SEC bulk → entity → resolver → packs → everything else.**

---

## 6. Process map (how work must flow)

### Ingest (only path to sources)

```text
calendars + watermarks → token bucket → adapter
  → bronze (hash, identity, status)
  → silver
  → resolver + mapping_version
  → gold
  → pack / fragment rebuild
  → cache invalidate
```

SEC large data: **backfill** (zips + DERA) → **daily index diff** → **filing-season** Atom + Tier A first. Nightly zip is the safety net.

### Mapping / quality

```text
silver → resolve → identity tests
  pass → gold + provenance
  fail → ops queue → human approve → canary golden 10-Ks
       → rebuild gold FROM SILVER (no SEC)
```

### User decision (UI must end in an action)

```text
briefing / screen → company workspace
  → compare history / peers / macro
  → events (8-K, Form 4, 13F)
  → provenance + flags
  → watch | model | thesis note | export
```

If a view cannot end in one of those, it is a database browser.

### Alerts

```text
new accession in YOUR index → classify → remap if financials
  → evaluate rules on gold + events → notify
```

Never: user poll → live EDGAR.

### Models / AI / econometrics (later)

```text
job → snapshot extract (universe, as_of, mapping_version, hash)
    → isolated worker → store outputs + methodology

AI question → tools: gold metrics + chunks with filed_at <= as_of
            → refuse unsourced numbers
```

No LLM on the calculate path. No live OLS on the company-page request path.

### Incident

```text
403/429 or identity-test spike
  → circuit breaker (stop retries)
  → serve last good packs
  → replay bronze after fix
  → do not crawl HTML
```

---

## 7. Build sequence (capability gates)

Do not estimate calendar time. A phase is **done** only when its gate is true. You may design the next phase; you may not ship it early.

### P0 — Trustworthy warehouse

**Ship:** ticker search, ~20 corporate line items with provenance, filing list, ingest admin.

| WP | Work |
| --- | --- |
| 0.1 | Monorepo, CI, secrets, logs, deploy skeleton — **coded** |
| 0.2 | Ingest plane: identity, token bucket, backoff, watermarks, bronze writer — **coded, live off** |
| 0.3 | SEC: stream-extract nightly zips; daily index diff — **coded; fixture zips only** |
| 0.4 | Source-governance registry + ~30 series from BLS / BEA / EIA / Census / Fed–NY Fed / Treasury (not a FRED mirror) — **coded; fixture observations** |
| 0.5 | Entity: CIK, tickers, names, SIC, tiers A/B/C — **coded; demo universe** |
| 0.6 | Silver `sec_fact` / `sec_submission` with `filed_at`, units, accession — **coded from fixtures; companyfacts parser ready for bronze** |
| 0.7 | Corporate resolver, period-scoped synonyms, provenance — **coded (~20 lines + GP/FCF)** |
| 0.8 | Gold `statement_line` + read API + company page — **coded** |
| 0.9 | Admin: last ingest, 403/429, budget remaining, coverage — **coded** |
| 0.10 | Golden tests on 10–20 known 10-Ks (clean + messy) — **coded on fixture 10-Ks** |
| 0.11 | Versioned shared company pack + API rate limits (two users, one pack) — **coded** |

**Gate:** reload = **zero** source calls; two users share one pack; number shows tag/accession/form/filed-at; bronze replay is idempotent; SEC < 8 req/s; banks show unmapped, not fake revenue.

**Non-goals:** screener, AI, models, Form 4, prices.

### P1 — Intelligence (the product layer)

This is Version 1’s intellectual property — not a ratio dump.

| WP | Work |
| --- | --- |
| 1.1 | Shared company packs + fiscal calendar |
| 1.2 | Deterministic metrics: YoY, QoQ, TTM, margins, FCF, leverage, liquidity, net debt, coverage, cash conversion, inventory/receivables vs revenue |
| 1.3 | **Signal engine** (explainable): acceleration, margin deterioration, inventory/receivables divergence, weak conversion, leverage, peer out/underperformance. Each signal links to formula + periods + facts |
| 1.4 | Peer engine: industry + size + geo as start; **user-override** peer set; ranks, medians, divergence. SIC alone is not a valid peer set |
| 1.5 | **Driver map:** curated sector → economically *plausible* variables (e.g. autos: vehicle demand, auto credit, wages, industrial production). Label correlation vs plausible mechanism |
| 1.6 | Change-first company page: Key developments → is it unusual? → why might it be? → what to inspect. Evidence drill-down |
| 1.7 | Filing intelligence: structured financial diffs + material disclosure language changes (not full-document AI) |
| 1.8 | Watchlists + alerts from **your** index |
| 1.9 | First **scanner** only after 1.3–1.6 work on the demo universe |

**First demonstration (before a wide universe):** two or three industries, several years of SEC + a handful of drivers, **10–20 high-quality intelligence rules**, credible peers, evidence-linked retrieval. Prove a user understands a company faster. Do not ship a huge universe with shallow flags.

**Gate:** every flag opens to calculation + source; drivers are sector-curated not a dump of 30 series; two users share one pack; screens (when on) hit gold.

**Non-goals:** DCF, generic chat, 13F, full knowledge graph, portfolio, scenarios (design `as_of`; ship in P2).

### P2 — Events and memory

Bi-temporal facts + `as_of`; 8-K items; Form 3/4/5 (open-market vs grant/tax); 13F + amendment policy + lag label; event-driven fragment rebuild; structured diffs; as-of UI.

**Gate:** `as_of` before restatement returns original; Form 4 does not rebuild income statement; 8-K 2.02 ≠ generic 8-K; Tier A updates from index + one accession fetch.

### P3 — Decision tools

Semantic metrics used by API and jobs; identity/dual-tag flags; corporate annual model + DCF/comps + scenarios; thesis journal; composite alerts; decision-pack export; bank template or hide banks; mapping ops queue.

**Gate:** model actuals from metrics + `as_of`; mapping change rebuilds from silver; flags open to the check; job concurrency caps.

**Non-goals:** Monte Carlo, LBO, chat, Stata-like lab.

### P4 — AI analyst (tool operator, not a chatbot)

Allowed only after P1 signals, peers, drivers, and evidence packages exist.

Filing text stored once per accession; item-boundary chunks; hybrid search (Postgres + pgvector is enough at first); tool-calling into gold; “what changed” = **precomputed signal/diff** + cited chunks; mapping *suggestions* only; token budgets via selective retrieval.

Tools the AI may call: active signals, peer panel, driver map, scanner AST, filing passages. It does not invent flags.

**Gate:** no unsourced dollar figures; retrieval respects `as_of`; no FRED training; same 10-K is not re-embedded; every synthesis cites the evidence package.

**Non-goals:** autonomous recommendations; training a market LLM; AI as the hero above unsigned numbers.

### P5 — Econometrics, teams, commercial data

Snapshot OLS/panel + methodology; vintage macro policy; SSO/RLS/export audit; gold metric API; licensed prices **only if contracted**. Precursor **scoring** against later official vintages (economic-data agility brief) belongs here, not on the company page — see [ECONOMIC_DATA_AGILITY.md](./ECONOMIC_DATA_AGILITY.md).

**Gate:** a panel job cannot exhaust the API box; results show N, `as_of`, mapping version, hash; no cross-tenant leaks; quotas hold when the audience is large.

### P6 — External disruption traces

Parked. Comtrade / PortWatch / weather / ACLED traces after live gold and a trusted P1 page. See [TRADE_LOGISTICS_DISRUPTION.md](./TRADE_LOGISTICS_DISRUPTION.md). Do not implement in P0–P4.

**Gate:** event confidence ≠ financial-impact confidence; hypothesized edges labeled; no invented supply chains; user traffic never calls those agencies.

---

## 8. First slice (smallest product that is still the product)

1. Ingest plane + SEC bulk + index diff + source-governance registry  
2. Entity + corporate resolver (YTD vs quarterly, confidence, dimensions)  
3. **Demo universe:** 2–3 industries, several years of filings  
4. 10–20 intelligence rules + change-first company page + evidence drill-down  
5. Credible peers + a small curated driver map per industry  
6. Admin budgets / 403s + shared packs  

Then: scanner, then constrained AI tools, then events/graph/portfolio.

Not a chatbot. Not a modeler. Not a 10,000-name screen with empty signals.

---

## 9. UI rules

- **Change-first**, not ratio-first. Sequence: what changed → is it unusual → why might it be → what to inspect.
- Tabs: Overview | Financials | Filings | Peers | Drivers | Relationships (relationships can be thin in V1).
- Clicking a flag or “score” reveals metrics, methodology, period, and evidence. No black-box grades.
- Trust chrome on every claim: Observed / Calculated / Model / Interpretation.
- Store observations and chart **definitions**; render in the client (ECharts is a suitable default). Do not store chart images.
- Persistent company shell: ticker, period, as-filed/restated.
- Honest gaps: `unmapped`, `bank template required`, `copyright-restricted`.
- Keyboard jump-to-ticker; copy/export to Excel.
- Desktop-first for screen/model; mobile = watchlist, alerts, overview.
- Do not put unsourced AI above the statements.
- Do not make raw XBRL tags the primary UX.

---

## 10. AI feature rules (when you reach P4)

AI is a **research assistant over the warehouse**, not a data source.

**Allowed:** filing Q&A with accession links; “what changed” after structured diffs exist; mapping suggestions for humans; alert copy; natural language → screener AST; commentary on a model **after** it ran.

**Forbidden:** inventing CIKs, dates, or dollars; training on FRED or copyrighted series; unsourced summaries as the hero UI; buy/sell scores; sending source API keys to the browser or to the model.

Pattern: retrieve structured facts via API → retrieve chunks filtered by `filed_at` → generate with mandatory citations.

---

## 11. Modeling, stats, econometrics

| Layer | When | Rule |
| --- | --- | --- |
| Stats (YoY, TTM, ranks, z-scores) | P1 | Align fiscal periods; as-filed vs restated separate |
| Financial models | P3 | Deterministic engine on semantic actuals; user overrides audited; no LLM in calculate |
| Econometrics | P5 | Isolated snapshot jobs; vintage data or you have look-ahead; store methodology |

---

## 12. Enhancement order (after the spine exists)

Do not treat this as P0 scope.

1. Event layer: 8-K items, Form 4, 13F, 13D/G, amendments  
2. `as_of` time machine in the UI  
3. Knowledge graph: LEI/GLEIF, officers, counterparties, USAspending  
4. Filing diffs  
5. Industry templates and operating KPIs  
6. Decision journal, composite alerts, decision packs  
7. Explainable quality flags (not a secret fraud score)  
8. Licensed prices/estimates only when multiples are required  
9. External disruption traces (Comtrade / PortWatch / weather / ACLED) — **P6 only**; see [TRADE_LOGISTICS_DISRUPTION.md](./TRADE_LOGISTICS_DISRUPTION.md)  
10. Economic-data agility (confirmation, substitution, precursor scoring) — **complements Lattice**; P5/P6 only; see [ECONOMIC_DATA_AGILITY.md](./ECONOMIC_DATA_AGILITY.md)  

**Backend upgrade order:** bi-temporal `as_of` → semantic metrics + mapping-as-code → event ingest on the same control plane → event-driven packs → lineage/SLIs/replay → item-chunked search → linkbase resolver + mapping ops → isolated compute.

**Usually not enhancements:** general chatbot on day one; FRED clone; ingesting every form type; real-time tick UI; training your own market LLM.

---

## 13. Legal and product constraints

- Link every figure to the accession. Repeat the SEC DERA disclaimer: extracts can be wrong.
- Store citation + copyright class on every macro series.
- FRED: no training; no wholesale mirror; third-party series need their own permission for commercial redistribution.
- Source keys only on the ingest plane; rotate them.
- User theses/models are customer data (backup, deletion, RLS at team scale).
- “Not investment advice” in the product; counsel before signals.

---

## 14. Verification checklist (use after any change)

- [ ] Did any user-facing path gain a source HTTP call? If yes, revert.
- [ ] Is ingest still one identity, budgeted, with backoff?
- [ ] Does every new served number have provenance?
- [ ] Are gaps visible rather than zero-filled?
- [ ] Can gold rebuild from silver without SEC?
- [ ] For screens/models/AI: is `as_of` defined (or explicitly “latest restated”)?
- [ ] For AI: can every dollar be traced to a tool result?
- [ ] Would this feature work if EDGAR returned 403 for an hour? (last-good packs)
- [ ] If 10× more users opened this page at once, would they share a pack — or multiply source/DB work?
- [ ] Is the claim labeled Observed / Calculated / Model / Interpretation?
- [ ] Does this feature improve COMPANY → CHANGE → EXPLANATION → EVIDENCE → CONNECTIONS?

---

## 16. Feature decision filter

Before adding an API, dataset, model, or UI module, all of these should be mostly yes:

1. Does it help identify **what changed**?
2. Does it help decide whether the change is **unusual**?
3. Does it help explain a **plausible driver** (not a random correlation)?
4. Does it provide **better evidence**?
5. Does it reveal **related** companies, risks, or opportunities?
6. Can it be maintained **legally and operationally**?
7. Will users understand the result **without knowing the upstream API**?

If most answers are no, it does not belong in the current build.

**Version 1 is complete when** a user can search a U.S. public company, see normalized history, understand the most material recent changes, compare them with credible peers, inspect a small curated driver set, ask a **tool-using** AI follow-up, and trace every important answer to evidence.

Defer until that works: global expansion, patents, government contracts, full knowledge graphs, portfolio/scenario products, real-time prices, premium datasets.

---

## 17. Internal API (frontend talks only to this)

REST is enough for V1 (resources are obvious). Add GraphQL later only if the company workspace over-fetches.

| Area | Purpose |
| --- | --- |
| `GET /search/companies` | Ticker / name / CIK |
| `GET /companies/{id}/overview` | Pack: flags, health, period |
| `GET /companies/{id}/financials` | Canonical statements + provenance |
| `GET /companies/{id}/signals` | Explainable intelligence |
| `GET /companies/{id}/filings` | List + diffs |
| `GET /companies/{id}/peers` | Comparison panel |
| `GET /companies/{id}/drivers` | Curated economic variables |
| `GET /companies/{id}/relationships` | Effective-dated edges (thin in V1) |
| `GET /companies/{id}/evidence/{id}` | Source chain |
| `POST /scanner/query` | Structured filters (NL → AST is P4) |
| `POST /ai/research` | Job: tools + evidence package (P4) |
| `GET /meta/sources` | Governance: freshness, license, attribution |

---

## 18. Initial stack (do not buy a warehouse prematurely)

| Layer | V1 default | Add later when needed |
| --- | --- | --- |
| API | One service language (TS or Python) | Split only ingest vs API |
| OLTP | PostgreSQL (entities, facts, signals, users, edges) | Read replicas |
| Search/AI | Postgres + pgvector | Dedicated search when filing QPS hurts |
| OLAP | Postgres or Parquet jobs | ClickHouse/BigQuery when screens need it |
| Raw | S3-compatible (S3 or R2) | — |
| Cache | Redis + CDN for packs | Edge more regions |
| Jobs | Queue + schedulers | Autoscale **workers**, not SEC IPs |
| Charts | ECharts on stored observations | Financial chart lib if prices arrive |

Relationship graph: **Postgres edges first** (source, confidence, effective dates, evidence). Neo4j only after query volume proves it.

---

## 19. Cost shape (directional, not a quote)

Infrastructure (public data only — not licensed market data):

| Stage | What you are paying for |
| --- | --- |
| Prototype | One region, small universe, object storage + one Postgres + Redis + a worker |
| MVP | Same shape; more storage for filings; still no ClickHouse required |
| 10k MAU | Cache/CDN and Postgres I/O; job minutes if models/AI are on |
| 100k MAU | Replicas, edge packs, quota enforcement; **LLM and export** dominate if unbounded |

User growth should spend money on **your** API, cache, and DB — never on extra SEC call volume. Separate any future vendor quotes (prices, consensus) from this infra bill.

---

## 20. How to use this guide

1. Run the **§16 filter**.  
2. Place the feature on a **phase**. AI belongs after P1 tools exist; econometrics after `as_of`.  
3. Implement in the **workstream that owns it**.  
4. Follow the **process map**; no live-proxy shortcuts.  
5. Pass the **phase gate** and **§14 checklist**.  
6. Deep-dive: investigation for source/legal; build plan for full WP tables.

If you are unsure, prefer **fewer source calls, more provenance, and an honest gap** over a complete-looking table.
