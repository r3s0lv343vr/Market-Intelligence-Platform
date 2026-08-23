import type { Asset, HistoryPoint, Insights } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getAssets: () =>
    request<{ assets: Asset[] }>("/api/assets").then((d) => d.assets),
  getInsights: () => request<Insights>("/api/insights"),
  getHistory: (symbol: string) =>
    request<{ symbol: string; history: HistoryPoint[] }>(
      `/api/assets/${symbol}/history`,
    ).then((d) => d.history),
  getWatchlist: () =>
    request<{ watchlist: Asset[] }>("/api/watchlist").then((d) => d.watchlist),
  addToWatchlist: (symbol: string) =>
    request<Asset>("/api/watchlist", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),
  removeFromWatchlist: (symbol: string) =>
    request<{ removed: string }>(`/api/watchlist/${symbol}`, {
      method: "DELETE",
    }),
};
