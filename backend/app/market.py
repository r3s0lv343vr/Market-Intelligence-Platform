"""Deterministic synthetic market data.

Real market feeds require network access and API keys, which makes local
development flaky. Instead we generate a stable, seeded random walk per symbol
so the dashboard shows realistic-looking data that is identical on every run.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta, timezone
from typing import List


@dataclass(frozen=True)
class Asset:
    symbol: str
    name: str
    sector: str
    base_price: float


# A small, curated universe of assets across sectors.
UNIVERSE: List[Asset] = [
    Asset("AAPL", "Apple Inc.", "Technology", 189.0),
    Asset("MSFT", "Microsoft Corp.", "Technology", 415.0),
    Asset("NVDA", "NVIDIA Corp.", "Technology", 121.0),
    Asset("AMZN", "Amazon.com Inc.", "Consumer", 178.0),
    Asset("GOOGL", "Alphabet Inc.", "Technology", 168.0),
    Asset("TSLA", "Tesla Inc.", "Consumer", 245.0),
    Asset("JPM", "JPMorgan Chase", "Financials", 205.0),
    Asset("XOM", "Exxon Mobil", "Energy", 113.0),
    Asset("PFE", "Pfizer Inc.", "Healthcare", 28.0),
    Asset("BTC", "Bitcoin", "Crypto", 61000.0),
    Asset("ETH", "Ethereum", "Crypto", 3400.0),
    Asset("SPY", "S&P 500 ETF", "Index", 545.0),
]

_BY_SYMBOL = {a.symbol: a for a in UNIVERSE}

# Number of historical trading days generated per asset.
HISTORY_DAYS = 90


def _seed(symbol: str) -> int:
    digest = hashlib.sha256(symbol.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _daily_prices(asset: Asset) -> List[dict]:
    """Generate a deterministic price series ending today.

    Uses a seeded sinusoid plus a bounded pseudo-random walk so the curve looks
    organic but never diverges wildly from the asset's base price.
    """
    seed = _seed(asset.symbol)
    volatility = 0.018 + (seed % 25) / 1000.0  # 1.8% - 4.3% daily swing
    prices: List[dict] = []
    today = datetime.now(timezone.utc).date()
    price = asset.base_price
    for i in range(HISTORY_DAYS):
        day: date = today - timedelta(days=(HISTORY_DAYS - 1 - i))
        # Deterministic pseudo-random step in [-1, 1].
        step_seed = (seed + i * 2654435761) & 0xFFFFFFFF
        noise = math.sin(step_seed) * 0.5 + math.sin(step_seed / 7.0) * 0.5
        drift = math.sin((i / HISTORY_DAYS) * math.pi * 2 + seed) * 0.004
        price = max(0.01, price * (1 + drift + noise * volatility))
        prices.append(
            {
                "date": day.isoformat(),
                "close": round(price, 2),
            }
        )
    return prices


def list_assets() -> List[dict]:
    results = []
    for asset in UNIVERSE:
        series = _daily_prices(asset)
        last = series[-1]["close"]
        prev = series[-2]["close"]
        change = last - prev
        change_pct = (change / prev) * 100 if prev else 0.0
        results.append(
            {
                **asdict(asset),
                "price": last,
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
            }
        )
    return results


def get_asset(symbol: str) -> dict | None:
    symbol = symbol.upper()
    if symbol not in _BY_SYMBOL:
        return None
    for a in list_assets():
        if a["symbol"] == symbol:
            return a
    return None


def get_history(symbol: str) -> List[dict] | None:
    symbol = symbol.upper()
    asset = _BY_SYMBOL.get(symbol)
    if asset is None:
        return None
    return _daily_prices(asset)


def is_valid_symbol(symbol: str) -> bool:
    return symbol.upper() in _BY_SYMBOL


def get_insights() -> dict:
    """Compute simple market-intelligence signals from the current snapshot."""
    assets = list_assets()
    ranked = sorted(assets, key=lambda a: a["change_pct"], reverse=True)
    gainers = [a for a in ranked if a["change_pct"] > 0][:3]
    losers = [a for a in ranked if a["change_pct"] < 0][-3:][::-1]

    avg_change = sum(a["change_pct"] for a in assets) / len(assets)
    # Map average change to a 0-100 sentiment index centered at 50.
    sentiment = max(0, min(100, round(50 + avg_change * 8)))
    if sentiment >= 60:
        mood = "Bullish"
    elif sentiment <= 40:
        mood = "Bearish"
    else:
        mood = "Neutral"

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sentiment_index": sentiment,
        "mood": mood,
        "avg_change_pct": round(avg_change, 2),
        "top_gainers": gainers,
        "top_losers": losers,
    }
