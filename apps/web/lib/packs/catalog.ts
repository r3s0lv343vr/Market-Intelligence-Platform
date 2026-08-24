import type { CompanyPack } from "../types";

export type Generation = {
  id: number;
  packVersion: string;
  publishedAt: string | null;
  status: "staging" | "live";
  packs: Map<string, CompanyPack>;
};

/**
 * Live vs staging catalog.
 * Readers only see `live`. Ingest writes `staging`, then swaps the pointer.
 * A swap is one assignment — users never wait on SEC or on zip extract.
 */
export class PackCatalog {
  private live: Generation;
  private staging: Generation | null = null;
  private ingestRunning = false;
  private lastPublishedEasternDate: string | null = null;
  private seq: number;

  constructor(initial: Generation) {
    this.live = { ...initial, status: "live", packs: new Map(initial.packs) };
    this.seq = initial.id;
  }

  snapshot() {
    return {
      liveGeneration: this.live.id,
      livePackVersion: this.live.packVersion,
      livePublishedAt: this.live.publishedAt,
      stagingGeneration: this.staging?.id ?? null,
      ingestRunning: this.ingestRunning,
      lastPublishedEasternDate: this.lastPublishedEasternDate,
      companyCount: this.live.packs.size,
    };
  }

  get(ticker: string): CompanyPack | null {
    const pack = this.live.packs.get(ticker.toUpperCase()) ?? null;
    return pack ? { ...pack } : null;
  }

  listTickers(): string[] {
    return [...this.live.packs.keys()];
  }

  beginStaging(packVersion: string): Generation {
    if (this.ingestRunning) {
      throw new Error("Ingest already running. Live catalog is unchanged.");
    }
    this.ingestRunning = true;
    this.seq += 1;
    this.staging = {
      id: this.seq,
      packVersion,
      publishedAt: null,
      status: "staging",
      packs: new Map(),
    };
    return this.staging;
  }

  writeStaging(ticker: string, pack: CompanyPack): void {
    if (!this.staging || !this.ingestRunning) {
      throw new Error("No staging generation. Live catalog is unchanged.");
    }
    this.staging.packs.set(ticker.toUpperCase(), pack);
  }

  /** Publish only when staging is complete. Live readers keep the previous generation until this returns. */
  publish(publishedAt: string, easternDate: string): Generation {
    if (!this.staging || this.staging.packs.size === 0) {
      this.abandonStaging();
      throw new Error("Refusing to publish an empty staging generation.");
    }
    const live: Generation = {
      ...this.staging,
      status: "live",
      publishedAt,
    };
    this.live = live;
    this.staging = null;
    this.ingestRunning = false;
    this.lastPublishedEasternDate = easternDate;
    return live;
  }

  abandonStaging(): void {
    this.staging = null;
    this.ingestRunning = false;
  }

  alreadyPublishedOn(easternDate: string): boolean {
    return this.lastPublishedEasternDate === easternDate;
  }
}

export function generationFromPacks(
  id: number,
  packVersion: string,
  publishedAt: string,
  packs: CompanyPack[],
): Generation {
  const map = new Map<string, CompanyPack>();
  for (const pack of packs) {
    map.set(pack.company.ticker.toUpperCase(), {
      ...pack,
      packVersion,
      generation: id,
      publishedAt,
    });
  }
  return {
    id,
    packVersion,
    publishedAt,
    status: "live",
    packs: map,
  };
}
