#!/usr/bin/env bash
# Idempotent dependency setup for the Market Intelligence Platform.
# Safe to run repeatedly: it only creates the venv when missing and lets pip/npm
# reconcile already-installed dependencies.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# System dependency: the base image ships Python but not the venv module.
if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  echo "[install] installing python3-venv system package"
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3.12-venv
fi

echo "[install] backend dependencies"
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt

echo "[install] frontend dependencies"
cd "$ROOT/frontend"
npm install

echo "[install] done"
