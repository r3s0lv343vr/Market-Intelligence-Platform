# Market Intelligence Platform — AI Guide

**Read this first** before writing code, designing a feature, or calling a government API.

This guide collates the investigation, enhancement paths, project map, process map, and gated build plan into one instruction set for humans and coding agents.

| Detail | Document |
| --- | --- |
| Why these constraints exist | [MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md](./MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md) |
| Workstreams, processes, phase work packages | [BUILD_PLAN.md](./BUILD_PLAN.md) |

This product is **not investment advice**. Extracts are not a substitute for the filing. Rate limits and terms change; re-verify official pages before production.

---

## 1. What you are building

A market-intelligence platform that compiles **government and public data** so users can decide:

- How is this company doing versus its history and a defensible peer set?
- What changed in the latest 10-Q / 10-K — company-specific or macro?
- Which names in a sector show margin, leverage, or cash-conversion stress?
- How do rates, labor, inflation, energy, or fiscal conditions change the backdrop?
- What does a simple model imply if I change growth, margin, or WACC?

The product is **joins across sources that were never designed to be joined** — not a filing dump and not a Bloomberg clone.

**North star**

```text
Sources → ingest plane → bronze → silver → gold → product APIs
                                              ↓
                                    users decide (never call SEC)
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
8. **Provenance on every served number.** Tag, accession, form, filed-at, as-filed vs restated, mapping version.
9. **Numbers in AI answers come from gold tools only.** If the model cannot cite a stored fact, it refuses the figure. Do not train on FRED content.
10. **No extra source calls to look busy.** No polling BLS/BEA every few minutes. Honor release calendars.
11. **Do not start P4/P5 to look advanced.** Chat, econometrics, and buy/sell signals amplify wrong mapping.
12. **This is not an advice engine.** No autonomous “buy/sell.” Modeling tools are fine; recommendations are a compliance change.
13. **Design serving for a large audience.** 1,500 users is an early cohort, not the ceiling. Shared packs, quotas, and a partitioned user store from P0. User growth never changes ingest.

### Behaviors that get the platform flagged

| Do not | Do |
| --- | --- |
| Browser/client calling `data.sec.gov` | Product API → gold/packs |
| Fetch companyfacts on cache miss in a user request | Pack rebuild from ingest |
| Horizontal ingest across many IPs | One control plane, priority queues |
| `python-requests/2.x` / generic User-Agent | `MarketIntel Platform contact@domain` |
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
| **FRED** | Small curated overlay only if needed | ~120 req/min typical; **no AI/ML training**; no FRED-clone UX; per-series copyright | Convenience — prefer original agencies |

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
| 0.1 | Monorepo, CI, secrets, logs, deploy skeleton |
| 0.2 | Ingest plane: identity, token bucket, backoff, watermarks, bronze writer |
| 0.3 | SEC: stream-extract nightly zips; daily index diff |
| 0.4 | Macro: ~30 series from Treasury / BLS / BEA (not a FRED mirror) |
| 0.5 | Entity: CIK, tickers, names, SIC, tiers A/B/C |
| 0.6 | Silver `sec_fact` / `sec_submission` with `filed_at`, units, accession |
| 0.7 | Corporate resolver, period-scoped synonyms, provenance |
| 0.8 | Gold `statement_line` + read API + company page |
| 0.9 | Admin: last ingest, 403/429, budget remaining, coverage |
| 0.10 | Golden tests on 10–20 known 10-Ks (clean + messy) |
| 0.11 | Versioned shared company pack + API rate limits (two users, one pack) |

**Gate:** reload = **zero** source calls; number shows tag/accession/form/filed-at; bronze replay is idempotent; SEC < 8 req/s; banks show unmapped, not fake revenue.

**Non-goals:** screener, AI, models, Form 4, prices.

### P1 — Intelligence

Packs, peer sets, TTM/ranks, screener + row cap + CSV, sector + macro overlay, watchlists, alerts from **your** index, fiscal calendar service.

**Gate:** screens hit gold not raw facts; overlays cited; alerts do not fetch EDGAR on the request path; export includes provenance.

**Non-goals:** DCF, chat, 13F (design `as_of`; ship in P2).

### P2 — Events and memory

Bi-temporal facts + `as_of`; 8-K items; Form 3/4/5 (open-market vs grant/tax); 13F + amendment policy + lag label; event-driven fragment rebuild; structured diffs; as-of UI.

**Gate:** `as_of` before restatement returns original; Form 4 does not rebuild income statement; 8-K 2.02 ≠ generic 8-K; Tier A updates from index + one accession fetch.

### P3 — Decision tools

Semantic metrics used by API and jobs; identity/dual-tag flags; corporate annual model + DCF/comps + scenarios; thesis journal; composite alerts; decision-pack export; bank template or hide banks; mapping ops queue.

**Gate:** model actuals from metrics + `as_of`; mapping change rebuilds from silver; flags open to the check; job concurrency caps.

**Non-goals:** Monte Carlo, LBO, chat, Stata-like lab.

### P4 — AI / research

Filing text stored once per accession; item-boundary chunks; hybrid search; tool-calling into gold; “what changed” = structured diff + cited chunks; mapping *suggestions* only; token budgets.

**Gate:** no unsourced dollar figures; retrieval respects `as_of`; no FRED training; same 10-K is not re-embedded.

**Non-goals:** autonomous recommendations; training a market LLM.

### P5 — Econometrics, teams, commercial data

Snapshot OLS/panel + methodology; vintage macro policy; SSO/RLS/export audit; gold metric API; licensed prices **only if contracted**.

**Gate:** a panel job cannot exhaust the API box; results show N, `as_of`, mapping version, hash; no cross-tenant leaks.

---

## 8. First slice (smallest product that is still the product)

If you implement only one slice:

1. Ingest plane + SEC bulk + index diff  
2. Entity + corporate resolver + provenance  
3. Company page + filing list  
4. Admin budgets / 403s  
5. Then immediately: packs + screener + one sector overlay  

Not a chatbot. Not a modeler.

---

## 9. UI rules

- Professional research tool: density, tabular figures, compare-by-default.
- Persistent company shell: ticker, period, as-filed/restated; panes for overview, statements, filings, peers, overlay, (later) events/model.
- Provenance visible on hover.
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

---

## 15. How to use this guide

1. Place the requested feature on a **phase**. If it needs AI, models, or econometrics and P0–P2 are not green, it is out of order.  
2. Implement in the **workstream that owns it** (ingest vs serving vs resolver).  
3. Follow the **process map**; do not invent a live-proxy shortcut.  
4. Pass the **phase gate** and **§14 checklist**.  
5. Deep-dive only as needed: investigation for source/legal detail; build plan for full WP tables.

If you are unsure, prefer **fewer source calls, more provenance, and an honest gap** over a complete-looking table.
