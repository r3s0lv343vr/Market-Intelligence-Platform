# Market Intelligence Platform

A small full-stack market-intelligence dashboard: a FastAPI backend that serves
market data, computed insights, and a persistent watchlist, plus a React + Vite
dashboard that visualizes it.

The market data is generated with a deterministic, seeded model so the app runs
fully offline with no API keys — ideal for local development and demos.

## Architecture

| Layer    | Stack                        | Port   | Notes                                             |
| -------- | ---------------------------- | ------ | ------------------------------------------------- |
| Backend  | Python 3.12 · FastAPI · SQLite | `8000` | REST API under `/api`; watchlist persisted to SQLite |
| Frontend | React 18 · Vite · TypeScript · Recharts | `5173` | Dashboard; dev server proxies `/api` to the backend |

## API

| Method   | Endpoint                       | Description                          |
| -------- | ------------------------------ | ------------------------------------ |
| `GET`    | `/api/health`                  | Health check                         |
| `GET`    | `/api/assets`                  | Market overview for all assets       |
| `GET`    | `/api/assets/{symbol}`         | Single asset snapshot                |
| `GET`    | `/api/assets/{symbol}/history` | 90-day price history                 |
| `GET`    | `/api/insights`                | Sentiment index, top movers          |
| `GET`    | `/api/watchlist`               | Current watchlist                    |
| `POST`   | `/api/watchlist`               | Add a symbol (`{"symbol": "AAPL"}`)  |
| `DELETE` | `/api/watchlist/{symbol}`      | Remove a symbol                      |

## Local development

Dependencies (Python venv + backend packages, frontend npm packages) are set up
with a single idempotent script:

```bash
bash scripts/install.sh
```

Then run the two services (in separate terminals):

```bash
bash scripts/run-backend.sh    # http://localhost:8000
bash scripts/run-frontend.sh   # http://localhost:5173
```

Open http://localhost:5173 and add a symbol (e.g. `AAPL`) to your watchlist.

## Cloud Agent environment

`.cursor/environment.json` configures the Cloud Agent environment:

- `install` runs `scripts/install.sh` to refresh dependencies.
- Two `terminals` run the backend and frontend dev servers.
- Ports `8000` (api) and `5173` (web) are exposed.
