export interface Asset {
  symbol: string;
  name: string;
  sector: string;
  base_price: number;
  price: number;
  change: number;
  change_pct: number;
  added_at?: string;
}

export interface HistoryPoint {
  date: string;
  close: number;
}

export interface Insights {
  generated_at: string;
  sentiment_index: number;
  mood: "Bullish" | "Bearish" | "Neutral";
  avg_change_pct: number;
  top_gainers: Asset[];
  top_losers: Asset[];
}
