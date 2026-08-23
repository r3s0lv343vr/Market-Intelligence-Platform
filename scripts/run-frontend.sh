#!/usr/bin/env bash
# Run the Vite dev server, which proxies /api to the backend on port 8000.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend"
exec npm run dev
