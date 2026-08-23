# Market Intelligence Platform

Investigation of what it would take to build a market-intelligence product on government and public data — especially SEC company financials — without unnecessary API calls or source flagging.

The full brief covers ingest architecture, data pairing, warehouse design, 1,500+ user scale, product evolution, UI, AI, financial modeling, statistics, and econometrics:

**[docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md](docs/MARKET_INTELLIGENCE_PLATFORM_INVESTIGATION.md)**

## Core design rule

User traffic never hits source APIs. Users query a warehouse. A single identified, rate-limited ingest plane pulls from SEC bulk files and other agency sources on their own calendars.

## Status

Research and architecture investigation only. No application code yet.
