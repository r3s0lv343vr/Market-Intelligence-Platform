import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "./api";
import type { Asset, HistoryPoint, Insights } from "./types";

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function money(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function InsightsBar({ insights }: { insights: Insights | null }) {
  if (!insights) return null;
  return (
    <div className="card insights">
      <div className="stat">
        <div className="value">
          <span className={`badge ${insights.mood}`}>{insights.mood}</span>
        </div>
        <div className="label">Market sentiment</div>
      </div>
      <div className="stat">
        <div className="value">{insights.sentiment_index}/100</div>
        <div className="label">Sentiment index</div>
      </div>
      <div className="stat">
        <div className={`value ${insights.avg_change_pct >= 0 ? "up" : "down"}`}>
          {pct(insights.avg_change_pct)}
        </div>
        <div className="label">Avg. daily change</div>
      </div>
      <div className="stat">
        <div className="value">
          {insights.top_gainers[0]?.symbol ?? "—"}
        </div>
        <div className="label">Top gainer</div>
      </div>
    </div>
  );
}

function PriceChart({
  symbol,
  price,
  history,
}: {
  symbol: string;
  price: number;
  history: HistoryPoint[];
}) {
  const rising =
    history.length > 1 && history[history.length - 1].close >= history[0].close;
  const color = rising ? "#2ecc71" : "#ff5c7a";
  return (
    <div className="card">
      <div className="chart-head">
        <h2 style={{ margin: 0 }}>{symbol} · 90-day trend</h2>
        <div className="price">${money(price)}</div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={history} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: "#93a0c9", fontSize: 11 }}
            tickFormatter={(d: string) => d.slice(5)}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#93a0c9", fontSize: 11 }}
            width={54}
            tickFormatter={(v: number) => `$${Math.round(v)}`}
          />
          <Tooltip
            contentStyle={{
              background: "#151b31",
              border: "1px solid #273156",
              borderRadius: 8,
              color: "#e7ecff",
            }}
            formatter={(v: number) => [`$${money(v)}`, "Close"]}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={2}
            fill="url(#grad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [watchlist, setWatchlist] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [input, setInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const refreshCore = useCallback(async () => {
    const [a, i, w] = await Promise.all([
      api.getAssets(),
      api.getInsights(),
      api.getWatchlist(),
    ]);
    setAssets(a);
    setInsights(i);
    setWatchlist(w);
    setSelected((prev) => prev || a[0]?.symbol || "");
  }, []);

  useEffect(() => {
    refreshCore().catch((e) => setError(String(e.message ?? e)));
  }, [refreshCore]);

  useEffect(() => {
    if (!selected) return;
    api
      .getHistory(selected)
      .then(setHistory)
      .catch((e) => setError(String(e.message ?? e)));
  }, [selected]);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.symbol === selected),
    [assets, selected],
  );

  const watchedSymbols = useMemo(
    () => new Set(watchlist.map((w) => w.symbol)),
    [watchlist],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const symbol = input.trim().toUpperCase();
    if (!symbol) return;
    setBusy(true);
    setError("");
    try {
      await api.addToWatchlist(symbol);
      setInput("");
      setWatchlist(await api.getWatchlist());
      setSelected(symbol);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(symbol: string) {
    setError("");
    try {
      await api.removeFromWatchlist(symbol);
      setWatchlist(await api.getWatchlist());
    } catch (err) {
      setError(String((err as Error).message ?? err));
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>Market Intelligence Platform</h1>
          <div className="subtitle">
            Live market overview, trend analysis, and a personal watchlist
          </div>
        </div>
        {insights && (
          <div className="subtitle">
            Updated {new Date(insights.generated_at).toLocaleTimeString()}
          </div>
        )}
      </header>

      <InsightsBar insights={insights} />

      <div className="grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {selectedAsset && history.length > 0 && (
            <PriceChart
              symbol={selectedAsset.symbol}
              price={selectedAsset.price}
              history={history}
            />
          )}

          <div className="card">
            <h2>Market overview</h2>
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th className="num">Price</th>
                  <th className="num">24h</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr
                    key={a.symbol}
                    className={`selectable ${a.symbol === selected ? "active" : ""}`}
                    onClick={() => setSelected(a.symbol)}
                  >
                    <td>
                      <strong>{a.symbol}</strong>
                    </td>
                    <td>{a.name}</td>
                    <td className="num">${money(a.price)}</td>
                    <td className={`num ${a.change_pct >= 0 ? "up" : "down"}`}>
                      {pct(a.change_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>My watchlist</h2>
          <form className="watchlist-form" onSubmit={handleAdd}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add symbol (e.g. AAPL)"
              aria-label="Add symbol to watchlist"
            />
            <button type="submit" disabled={busy || !input.trim()}>
              Add
            </button>
          </form>
          <p className="error">{error}</p>
          {watchlist.length === 0 ? (
            <div className="empty">
              Your watchlist is empty. Add a symbol to start tracking it.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th className="num">Price</th>
                  <th className="num">24h</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((a) => (
                  <tr
                    key={a.symbol}
                    className={`selectable ${a.symbol === selected ? "active" : ""}`}
                    onClick={() => setSelected(a.symbol)}
                  >
                    <td>
                      <strong>{a.symbol}</strong>
                    </td>
                    <td className="num">${money(a.price)}</td>
                    <td className={`num ${a.change_pct >= 0 ? "up" : "down"}`}>
                      {pct(a.change_pct)}
                    </td>
                    <td className="num">
                      <button
                        className="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(a.symbol);
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {watchedSymbols.size > 0 && (
            <p className="subtitle" style={{ marginTop: 12 }}>
              Tracking {watchedSymbols.size} symbol
              {watchedSymbols.size === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
