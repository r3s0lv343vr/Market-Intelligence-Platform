# Trace Market Intelligence — Status

**Product:** Trace Market Intelligence (`TraceMI/0.1`)  
**Updated:** 16 October 2026  
**This file is the tracking surface.** Plans and parked briefs stay in the other docs; this page says what is true now, what is next, and what was corrected.

Identity (ingest jobs only): `TraceMI/0.1 (Trace Market Intelligence; tracemarketintelligence@gmail.com)`

---

## Honest correction (storage)

The **project outline did not change.** A later chat answer about the ThinkCentre SSD was wrong in how it described nightly growth.

| What was said (wrong) | What the plan always was | What is true |
| --- | --- | --- |
| ~160 GB **every night**, so 2 TB fills in two weeks | **One full bulk backfill**, then **daily reconcile** (new zip + index). A second full unpack of the universe is overbearing and was never the scope | SEC still **publishes** two full zips every night (~1.4 GB + ~2 GB). We **download** those (few GB). We **unpack CIK JSON once** into a single `live/` tree (~40–70 GB). Later nights do **not** keep another 40–70 GB extract |
| 8 GB RAM / **160 GB** VPS was a different, smaller project | That size was the **Linux worker** for **one** generation: OS + one extract + current zips + headroom | Still the P0 worker target on Linux. Not 160 GB of *new* bronze per night |
| 256 GB SSD “only lasts a day”; 512 GB floor; 2 TB for “many extracts” | 2 TB was never required for P0 | 256 GB is tight **because Windows 11 uses 70–100 GB**, not because bronze is 256 GB/night. 512 GB is comfortable on Windows. 1 TB is optional headroom, not a new goal |

**P6’s 250 GB+** (Comtrade / weather later) is a **later** warehouse floor, after live gold. It is not the nightly SEC job.

The worker had a **bug against the plan**: it unpacked each night into a **new dated folder**, which *would* have stacked full extracts. That is corrected: dated **zips** (keep the last two days); one **live** extract; later nights save the new zip + `master.idx` and do not unpack a second universe.

---

## Where we are

**P0 on fixtures is coded.** The public site is a strong demo, not a live-SEC product, until one accepted HTTP (or PDS) ingest exists.

| Layer | State |
| --- | --- |
| Website | Next.js app: search, company pages (NSM, HBT, LATT fixtures), admin. Reads gold packs only |
| Hostinger | Production serving (tracemarketintelligence.com). **No** ingest flags |
| Vercel | Preview / clock only. **No** EDGAR |
| Ingest worker | Coded, **live off**. Fixture zips only in CI |
| Live SEC | **Not running.** Cloud VPS (Hetzner, then DigitalOcean) returned **403** on the first identified bulk GET. Do not add another datacenter IP |
| P1–P6 | Not built. Lattice, agility, P6 traces, company geography: **documented, parked** |

P0 work packages 0.1–0.11: **coded on fixtures.** Gate still open for *live* SEC: zero source calls on reload is true for the site; live bronze from EDGAR is not.

---

## What is next (do not skip)

1. **Home/office worker** — [WORKER_SETUP.md](./WORKER_SETUP.md): mini PC on the **router** (not through the laptop’s internet), RDP from the laptop to set tasks, then leave it on. One IPv4, WSL2, flags **only** on that box.  
2. **Refuse test** (flags off) → **one** `ingest:worker:once`. 403 → circuit, no retry, then webmaster if it is a real block.  
3. If HTTP works: first night **full extract** into `live/`; later nights **zip + index** only; copy gold packs to Hostinger when silver/gold run from that bronze.  
4. If HTTP stays blocked: **PDS** (paid) or stay on fixtures. Not a third VPS, VPN, or proxy.  
5. **P1 on fixtures** when you say **build P1** — change-first page, explainable flags, peers, curated drivers. Not a screener-first, not Palantir clones, not live maps.

Do not start P4/P5/P6, Akashic, OpenFoundry, or trading VPS to look advanced.

---

## Maps (already in the plan; geography parked)

| Map | Where | Status |
| --- | --- | --- |
| Project / workstreams | [BUILD_PLAN.md](./BUILD_PLAN.md) §1 | Written |
| Phase gates P0–P6 | [BUILD_PLAN.md](./BUILD_PLAN.md) §1.2, §3 | Written |
| Process (ingest → bronze → silver → gold) | [BUILD_PLAN.md](./BUILD_PLAN.md) §2 | Written |
| SEC: backfill once, then daily reconcile | [BUILD_PLAN.md](./BUILD_PLAN.md) §2.2 and here | **Restated** so storage cannot be misread |
| Company geography / map UX | [COMPANY_GEOGRAPHY.md](./COMPANY_GEOGRAPHY.md) | **Parked** — first-class later, not Akashic |

---

## Worker hardware (P0 SEC only)

| Host | RAM | Disk | Verdict |
| --- | --- | --- | --- |
| Linux VPS (historical target) | 8 GB | **160 GB** | Sized for **one** extract + OS + zips. Cloud IPs were **refused** by SEC; do not rent another for EDGAR |
| ThinkCentre (Windows 11 + WSL2) | 16 GB | **256 GB** | CPU/RAM enough. Disk is tight **after Windows**, not because of nightly 160 GB dumps. First night can fit if the disk is clean and you use WSL2. Prefer **512 GB** so Windows Update cannot corner the extract |
| Same machine | 16 GB | **1 TB** | Convenience (logs, later P6, no prune anxiety). **Not required** for bronze P0 |
| 2 TB | — | — | Only if you *choose* to keep many **full dated extracts**. The product does **not** do that |

Steady state after night one (Linux): roughly **OS + ~40–70 GB live extract + ~8–12 GB for two zips + silver/gold**. That is why 160 GB was the original worker disk, not 2 TB.

---

## Related docs

- [AI_GUIDE.md](./AI_GUIDE.md) — hard rules  
- [INGEST_WORKER_HOST.md](./INGEST_WORKER_HOST.md) — where ingest may run  
- [WORKER_SETUP.md](./WORKER_SETUP.md) — home LAN, RDP from laptop, WSL timer  
- [BUILD_PLAN.md](./BUILD_PLAN.md) — phases  
- [COMPANY_GEOGRAPHY.md](./COMPANY_GEOGRAPHY.md) — map vision (parked)  
- [TRADE_LOGISTICS_DISRUPTION.md](./TRADE_LOGISTICS_DISRUPTION.md) — P6 (parked)  
- [ECONOMIC_DATA_AGILITY.md](./ECONOMIC_DATA_AGILITY.md) — agility (parked)  
- [INTELLIGENCE_CORE_DECISIONS.md](./INTELLIGENCE_CORE_DECISIONS.md) — Lattice (deferred)  
