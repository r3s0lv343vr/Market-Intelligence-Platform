# Trace — Company geography (visual evidence)

**Status:** Strategy **retained**. Parked. **Do not implement in P0–P4.**  
**Product:** Trace Market Intelligence (`TraceMI/0.1`)  
**Decision recorded:** 15–16 October 2026 — geography is first-class *later*, on the same warehouse as text, not a live OSINT globe.

This is how the map vision enters the repo: as a gated UX surface, not as Akashic, OpenFoundry, or a second platform.

Related: [TRADE_LOGISTICS_DISRUPTION.md](./TRADE_LOGISTICS_DISRUPTION.md) (P6 traces), [INTELLIGENCE_CORE_DECISIONS.md](./INTELLIGENCE_CORE_DECISIONS.md) (Lattice claims), [STATUS.md](./STATUS.md).

---

## Stance

Text and place are both evidence. A map can show clusters and gaps a table hides. That does **not** mean live-proxying aircraft, recon, or GDACS from the website.

**Company is the camera. The world is an overlay on disclosed/cached geography.**

```text
EVENT → GEOGRAPHY → INFRASTRUCTURE → TRADE FLOW → ECONOMY / INDUSTRY → COMPANY → OBSERVED EFFECT
```

That chain is P6. Filing Item 1 / 1A / 7 geography (P4 text, or an earlier extract) grounds the points. The map reads **gold and traces**, never source APIs on page load.

---

## What to keep (when gated)

- Company-first geography view (reported segments, facilities if disclosed, peers).  
- Click a point → same evidence pane as the company page (reported vs inferred, accession or series, confidence).  
- Cached worker ingest for any world layer (same collect-once rule as SEC).  
- Steal **UX ideas** from maps (layers, keep spatial context). Do not vendor AGPL Akashic. Do not deploy OpenFoundry as the Trace backend.

## What not to build now

- Live USGS / ADS-B / recon proxies from Hostinger, Vercel, or the browser  
- A Palantir-shaped second stack to “go faster” while SEC is dark  
- Invented supply chains or HBT revenue from a map  
- Treating trading-VPS latency as geography intelligence  

---

## When

| When | What |
| --- | --- |
| Fixtures (optional, only if you say build it) | Static company geography from fixture packs — no live feeds |
| After live gold + trusted P1 | P6 traces on that geography, warehouse tables, one composer |

Unmarked until you reply **include** on a work item. Default is parked.

**Decision:** include / reject / defer / discuss
