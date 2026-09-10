# Trace — Trade, Logistics & Disruption Intelligence

**Status:** Parked. Accepted as a **later workstream**, not as current build work.  
**Do not implement in P0–P4.** Do not add connectors, graphs, or UI until the gates below are true.  
**Product:** Trace Market Intelligence (`TraceMI/0.1`)  
**Source brief:** *Trace / Lattice — Trade, Logistics & Disruption Intelligence* (September 2026)  
**Decision recorded:** 7 September 2026 — park in the plan; mark items individually when the warehouse is live.

This file is how that brief enters the repo: as a gated workstream, not as engines in the running app.

Related: [INTELLIGENCE_CORE_DECISIONS.md](./INTELLIGENCE_CORE_DECISIONS.md) (Lattice — also deferred); [ECONOMIC_DATA_AGILITY.md](./ECONOMIC_DATA_AGILITY.md) (sensor confirmation, substitution, and scoring — complements this workstream). This workstream **is** Lattice applied to external shocks. Do not stand up a second intelligence platform.

---

## How to use this file

Reply **include**, **reject**, **defer**, or **discuss** next to each numbered item when you are ready to schedule work.

Unmarked items stay out of the build. The brief’s guardrails (exposure ≠ causation; split confidences) are already product rules; they do not need a new service to exist.

---

## Why it is in the plan

The product journey is `COMPANY → CHANGE → EXPLANATION → EVIDENCE → CONNECTIONS`.

Current P0–P1 covers change from **filings** and explanation from a **small US official overlay** (BLS, BEA, EIA, Census, Fed / NY Fed, Treasury). That does not cover physical or policy shocks: a port, a chokepoint, a commodity partner, a storm, a conflict corridor.

This workstream adds inspectable traces:

```text
EVENT → GEOGRAPHY → INFRASTRUCTURE → TRADE FLOW → ECONOMY / INDUSTRY → COMPANY → OBSERVED EFFECT
```

Early output is **exposure and risk**, not a dollar of damaged earnings. Financial-impact confidence stays low until something is observed (throughput, disclosure, later financials).

It is **not** a news API and **not** a geopolitics dashboard.

---

## Gates before any code

All of these must be true:

1. Live SEC bronze → silver → gold exists for a real coverage set (not only fixtures).
2. P1 change-first page is trusted on that set (flags open to formula + filing).
3. Company → country / commodity exposure can be **reported** (filing language or a cautious industry map), not invented from an HS average alone.
4. A dedicated **worker** with disk exists. Site traffic still never hits source APIs.
5. Each new source has its own identity, budget, citation, and calendar in the governance registry.

Until then: this document only.

---

## Where it sits in the build

| Layer | When | What |
| --- | --- | --- |
| P0–P1 | Now | Warehouse, mapping, change, peers, curated US drivers. **No** Comtrade/PortWatch/ACLED/ECMWF. |
| P2 | Company events | 8-K / Form 4 / 13F. Different from weather/conflict. Do not mix the panes. |
| P4 | Filing text | Item 1 / 1A / 7 geography and risk language **feeds** the exposure graph later. Still no disruption engines in P4. |
| **P6 — External disruption** | After P1 gate + live warehouse | Four *logical* graphs as warehouse tables; one composer (Lattice / claim compiler). |
| P5 econometrics | After P6 traces exist with history | Port × day baselines, analogues, ranges — not stage-4 ML first. |

Workstream **J** owns this. Workstream **H** must not grow extra SEC IPs. Workstream **I** stays filing/macro signals until P6 attaches.

Suggested P6 work packages (only after the gates):

| WP | Work | Depends on |
| --- | --- | --- |
| 6.0 | Evidence classes + split confidence (event / exposure / transmission / financial) | This doc, Lattice item 2 |
| 6.1 | UN Comtrade ingest (calendared, cached) → country–partner–HS nodes | Worker + registry |
| 6.2 | Evaluate IMF PortWatch; ports/routes/chokepoints if production access is clear | 6.1 |
| 6.3 | World Bank indicators + LPI (structural vulnerability) | 6.1 |
| 6.4 | ECMWF **port/route points only** (not global grids) | 6.2 |
| 6.5 | ACLED after account/OAuth; geospatial intersect; no event-count = impact | 6.2, 6.4 |
| 6.6 | Exposure edges from filings (reported) + cautious industry map (inferred, labeled) | P4 text or earlier extract; 6.1 |
| 6.7 | Bidirectional traces in UI: event → names; company → active traces | 6.0–6.6 |
| 6.8 | Historical analogues / interpretable port-day models | P5.1, 6.4, 6.2 |

**P6 non-goals:** news sentiment, a vessel-AIS clone, point forecasts of EPS, four deployable “engine” services, a second SEC IP.

**P6 gate**

- High event confidence never auto-raises financial-impact confidence.
- Hypothesized / inferred edges are visually distinct from observed / reported.
- No company-specific supply chain from industry average when the filing is silent.
- User handlers do not call Comtrade, PortWatch, ACLED, ECMWF, or NOAA.

---

## Items for later accept / reject

1. **Four logical graphs (Trade, Logistics, Disruption, Exposure) as warehouse tables, one composer.** Class: KEEP / candidate for P6. Do not ship four microservices.  
   Decision: include / reject / defer / discuss

2. **UN Comtrade as first new source.** Class: CANDIDATE FOR BUILD (first wave).  
   Decision: include / reject / defer / discuss

3. **IMF PortWatch before building a proprietary flow layer.** Class: EXPLORE FURTHER (confirm production API/licence).  
   Decision: include / reject / defer / discuss

4. **ECMWF open forecasts, NOAA history, NASA POWER as supplement.** Class: DEFER until ports/routes exist; ingest **points near nodes**, not the world.  
   Decision: include / reject / defer / discuss

5. **ACLED as first conflict source.** Class: DEFER until myACLED/OAuth and transmission checks exist.  
   Decision: include / reject / defer / discuss

6. **World Bank LPI and structural vulnerability.** Class: CANDIDATE (small; after Comtrade).  
   Decision: include / reject / defer / discuss

7. **Stage 1–2 only at first (exposure score, historical analogue ranges).** Class: KEEP. Reject single-number damage.  
   Decision: include / reject / defer / discuss

8. **Econometric / ML damage models (stages 3–5).** Class: DEFER to after P5 jobs + backtests.  
   Decision: include / reject / defer / discuss

9. **Policy / cyber / strike feeds.** Class: DEFER until the core trace is reliable.  
   Decision: include / reject / defer / discuss

---

## Capacity (when P6 starts)

- Still **one** SEC worker identity and IP.
- New keys/accounts: Comtrade, NOAA, ACLED; PortWatch as required. Each is its own ingest identity.
- Plan **8 GB RAM** and **250 GB+** disk or VPS + object storage.
- Split the website from the worker before weather/Comtrade jobs, if they share one Hostinger box.
- Do not keep global forecast grids forever.

---

## What not to do now

- Do not add these sources to the running fixture app.
- Do not put keys on Vercel.
- Do not start P6 to look advanced while live SEC is still off.
- Do not treat this PDF as approved implementation.

The brief’s strategic line stands: Trace should not try to predict every consequence. The advantage is showing how an event *could* move through a real network, what evidence supports each link, what is still a hypothesis, and when later data confirms or rejects it.
