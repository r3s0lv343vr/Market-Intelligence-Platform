"""Market Intelligence Platform API.

A small FastAPI service that serves market data, computed insights, and a
persistent watchlist. Designed to run fully offline for local development.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from . import db, market


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="Market Intelligence Platform API",
    version="0.1.0",
    description="Serves market data, insights, and a persistent watchlist.",
    lifespan=lifespan,
)

# The Vite dev server proxies /api, but allow direct cross-origin calls too.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class WatchlistItem(BaseModel):
    symbol: str

    @field_validator("symbol")
    @classmethod
    def _normalize(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("symbol must not be empty")
        return v


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/assets")
def get_assets() -> dict:
    return {"assets": market.list_assets()}


@app.get("/api/assets/{symbol}")
def get_asset(symbol: str) -> dict:
    asset = market.get_asset(symbol)
    if asset is None:
        raise HTTPException(status_code=404, detail=f"Unknown symbol: {symbol}")
    return asset


@app.get("/api/assets/{symbol}/history")
def get_asset_history(symbol: str) -> dict:
    history = market.get_history(symbol)
    if history is None:
        raise HTTPException(status_code=404, detail=f"Unknown symbol: {symbol}")
    return {"symbol": symbol.upper(), "history": history}


@app.get("/api/insights")
def get_insights() -> dict:
    return market.get_insights()


@app.get("/api/watchlist")
def get_watchlist() -> dict:
    symbols = db.list_watchlist()
    detailed = []
    for row in symbols:
        asset = market.get_asset(row["symbol"])
        if asset is not None:
            detailed.append({**asset, "added_at": row["added_at"]})
    return {"watchlist": detailed}


@app.post("/api/watchlist", status_code=201)
def add_to_watchlist(item: WatchlistItem) -> dict:
    if not market.is_valid_symbol(item.symbol):
        raise HTTPException(
            status_code=400,
            detail=f"Unknown symbol: {item.symbol}. Try one from /api/assets.",
        )
    record = db.add_symbol(item.symbol)
    asset = market.get_asset(item.symbol)
    return {**asset, "added_at": record["added_at"]}


@app.delete("/api/watchlist/{symbol}")
def remove_from_watchlist(symbol: str) -> dict:
    removed = db.remove_symbol(symbol)
    if not removed:
        raise HTTPException(status_code=404, detail=f"{symbol.upper()} not in watchlist")
    return {"removed": symbol.upper()}
