# Market Intelligence Platform

Investigation of what it would take to build a market-intelligence product on government and public data — especially SEC company financials — without unnecessary API calls or source flagging.

Investigation, enhancements, and the gated build plan (project map, process map, phase work packages):

- **[docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md](docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md)** — requirements and architecture
- **[docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)** — project map, process map, and build sequence

## Core design rule

User traffic never hits source APIs. Users query a warehouse. A single identified, rate-limited ingest plane pulls from SEC bulk files and other agency sources on their own calendars.

## Status

Research and architecture investigation only. No application code yet.
