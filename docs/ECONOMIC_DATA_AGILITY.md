# Trace — Economic Data Agility (complements Lattice)

**Status:** Strategy **retained**. Complements the intelligence core. **Do not implement in P0–P4.**  
**Product:** Trace Market Intelligence (`TraceMI/0.1`)  
**Source brief:** *Economic Data Agility Intelligence System* (September 2026)  
**Decision recorded:** 10 September 2026 — park as a complement to Lattice; mark items when gold is live.

This file is how that brief enters the repo: as a later **method and validation loop**, not as a second product or a set of Pulse engines.

Related:

- [INTELLIGENCE_CORE_DECISIONS.md](./INTELLIGENCE_CORE_DECISIONS.md) — Lattice: claim compiler on gold packs  
- [TRADE_LOGISTICS_DISRUPTION.md](./TRADE_LOGISTICS_DISRUPTION.md) — P6 traces (Lattice applied to shocks)  
- [BUILD_PLAN.md](./BUILD_PLAN.md) — P1 drivers, P5 vintages / scoring, P6 sensors  

---

## How to use this file

Reply **include**, **reject**, **defer**, or **discuss** next to each numbered item when you are ready to schedule work.

Unmarked items stay out of the build. No new connectors, nowcasts, social ingest, or dashboards until the gates below are true.

---

## Stance

**Complements Lattice. Does not replace it. Does not become a second platform.**

| | Lattice (core) | This brief |
| --- | --- | --- |
| Job | What changed **in this company**? | What is changing **in the economy**, earlier than official prints? |
| Unit | Claim on gold packs | High-frequency observation → precursor → later official outcome |
| Clock | Filing / quarter | Fast sensors vs monthly–quarterly anchors |
| Output | Company dossier | Pulse / nowcast / lead–lag score (later, isolated) |

Same discipline (provenance, contradiction, evidence vs hypothesis). Different object and clock. Do not merge them into one “nervous system” app.

P6 already owns ports, weather, conflict, and trade **traces**. This brief adds **confirmation, substitution, and scoring** around sensors — not four more deployable engines.

---

## What to keep (as rules, not new services)

- Official series (BLS, BEA, Census, Treasury, EIA, Fed / NY Fed) stay **anchors and validation targets**, not the enemy of agility.
- Independent **confirmation**, **persistence**, and **breadth** before a precursor claim is shown. One noisy proxy is not the variable.
- Traces labeled **evidence / inference / hypothesis**. Event confidence ≠ financial-impact confidence.
- **Vintages**: do not silently rewrite a past nowcast when the official print revises (P5).
- **Source substitution** in the governance registry: two permitted sources for an important variable; degrade confidence if one dies. Do not bypass paywalls, bots, or rate limits.
- No automatic buy/sell. Surprise vs consensus and security watchlists stay an **investment layer** (P5), not the company page.

---

## What not to build

- A Country Pulse / Economic Nervous System product beside Trace  
- Social/news/search as the first sensors (high noise and terms cost)  
- Fourteen named pulses as the v1 UI  
- A blended super-confidence number (already rejected in Lattice item 8)  
- Kalman / MIDAS / ensembles in P1 — isolated **P5** lab only, after interpretable composites  
- Calling sensor APIs from Hostinger, Vercel, the browser, or this cloud agent  
- Extra SEC (or other) IPs to “get agility”

---

## How it functions inside Trace (when allowed)

```text
Filings        → gold packs → Lattice claim compiler → company page
Official series → warehouse  → curated driver claims (P1.5)
Fast sensors    → observations → precursor claims / P6 traces   (after gates)
Official print  → validation job → reliability on that series     (P5)
```

Users still never hit source APIs. One worker identity per source.

| When | What this brief may do |
| --- | --- |
| **P1 on fixtures** | Discipline only: confirmation, persistence, observed vs inferred. No new sensors. |
| **Live gold + worker** | Same official anchors, live. Fast sensors only if permitted and calendared. |
| **P5** | Score precursor vs later CPI / payrolls / activity. Transparent composites first. |
| **P6** | Shock traces; this brief’s substitution and split-confidence rules apply. |

---

## Gates before any agility code

1. Live SEC bronze → silver → gold for a real coverage set (not fixtures only).  
2. P1 change-first page is trusted (flags open to formula + filing).  
3. A dedicated worker with disk exists. Site traffic still never hits source APIs.  
4. Each new sensor has identity, budget, citation, license, and calendar in the registry.

Until then: this document only.

---

## Items for later accept / reject

1. **Treat official prints as calibration and confirmation, not as the only clock.** Class: KEEP (already WP 0.4 / P1.5).  
   Decision: include / reject / defer / discuss

2. **Confirmation / persistence / breadth as claim methods** (not a Pulse Engine). Class: CANDIDATE for P1 rules on existing series.  
   Decision: include / reject / defer / discuss

3. **Signal-family substitution in the source registry** (permitted alternatives; degrade confidence). Class: CANDIDATE for registry, not scrapers.  
   Decision: include / reject / defer / discuss

4. **Validation loop: score a precursor against a later official vintage (P5).** Class: DEFER until live series and first-print policy exist.  
   Decision: include / reject / defer / discuss

5. **High-frequency sensors (search, jobs boards, prices, logistics, markets) as warehouse observations.** Class: DEFER; each source marked individually; not required for the company page.  
   Decision: include / reject / defer / discuss

6. **Social content → structured economic events** (e.g. HIRING_FREEZE). Class: DEFER / high privacy and terms cost. Not MVP.  
   Decision: include / reject / defer / discuss

7. **Nowcast / state-space / MIDAS as a delivery layer.** Class: REJECT for the company-page core; DEFER to isolated P5 lab.  
   Decision: include / reject / defer / discuss

8. **Investment layer: consensus surprise, revision velocity, security watchlists.** Class: DEFER to P5; not an advice engine.  
   Decision: include / reject / defer / discuss

---

## Response template

```
1. Official as calibration:     include / reject / defer / discuss
2. Confirmation as claim method: include / reject / defer / discuss
3. Registry substitution:       include / reject / defer / discuss
4. P5 validation / scoring:     include / reject / defer / discuss
5. Fast sensors as observations: include / reject / defer / discuss
6. Social → structured events:  include / reject / defer / discuss
7. Nowcast engines in core:     include / reject / defer / discuss
8. Investment surprise layer:   include / reject / defer / discuss
```

Awaiting your marks. No item enters the build until you say so.
