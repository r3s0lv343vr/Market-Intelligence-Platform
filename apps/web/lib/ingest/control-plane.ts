import { USER_AGENT } from "../identity";
import {
  assertLiveIngestAllowed,
  assertSecUrlAllowed,
  CircuitOpenError,
  liveIngestDecision,
  rateLimits,
  type IngestEnv,
} from "./policy";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type Clock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

const defaultClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export type CircuitState = "closed" | "open";

export type IngestEvent = {
  at: number;
  url: string;
  status?: number;
  error?: string;
};

/**
 * Single ingest identity control plane.
 * User-facing Next.js routes must not construct this or call secGet.
 */
export class IngestControlPlane {
  private tokens: number;
  private lastRefill: number;
  private circuit: CircuitState = "closed";
  private circuitReason: string | null = null;
  private events: IngestEvent[] = [];
  readonly requestCount = { attempted: 0, sent: 0 };

  constructor(
    private readonly env: IngestEnv = process.env,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
    private readonly clock: Clock = defaultClock,
  ) {
    this.tokens = rateLimits().burstCapacity;
    this.lastRefill = this.clock.now();
  }

  snapshot() {
    const decision = liveIngestDecision(this.env);
    return {
      liveAllowed: decision.ok,
      liveBlockReason: decision.ok ? null : decision.reason,
      circuit: this.circuit,
      circuitReason: this.circuitReason,
      requestsAttempted: this.requestCount.attempted,
      requestsSent: this.requestCount.sent,
      targetRps: rateLimits().targetRps,
      userAgent: USER_AGENT,
    };
  }

  resetCircuit(): void {
    this.circuit = "closed";
    this.circuitReason = null;
  }

  async secGet(urlString: string): Promise<Response> {
    this.requestCount.attempted += 1;
    assertLiveIngestAllowed(this.env);
    const url = assertSecUrlAllowed(urlString);

    if (this.circuit === "open") {
      throw new CircuitOpenError(
        `Ingest circuit is open (${this.circuitReason}). Do not retry. Serve last-good packs. A human must reset.`,
      );
    }

    await this.takeToken();

    const headers = new Headers();
    headers.set("User-Agent", USER_AGENT);
    headers.set("Accept", "application/zip, application/json, text/plain, */*");
    headers.set("Accept-Encoding", url.pathname.endsWith(".zip") ? "identity" : "gzip, deflate");

    this.requestCount.sent += 1;
    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method: "GET",
        headers,
        redirect: "follow",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      this.openCircuit(`transport: ${message}`);
      this.events.push({ at: this.clock.now(), url: url.toString(), error: message });
      throw new CircuitOpenError(`SEC request failed; circuit opened. ${message}`);
    }

    this.events.push({ at: this.clock.now(), url: url.toString(), status: response.status });

    if (response.status === 403 || response.status === 429) {
      this.openCircuit(`HTTP ${response.status}`);
      throw new CircuitOpenError(
        `SEC returned ${response.status}. Circuit opened with no retry. Check User-Agent and wait for ops.`,
      );
    }

    if (!response.ok) {
      this.openCircuit(`HTTP ${response.status}`);
      throw new CircuitOpenError(`SEC returned ${response.status}. Circuit opened with no retry.`);
    }

    return response;
  }

  private openCircuit(reason: string): void {
    this.circuit = "open";
    this.circuitReason = reason;
  }

  private async takeToken(): Promise<void> {
    const { targetRps, burstCapacity } = rateLimits();
    const now = this.clock.now();
    const elapsedSec = Math.max(0, (now - this.lastRefill) / 1000);
    this.tokens = Math.min(burstCapacity, this.tokens + elapsedSec * targetRps);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitMs = Math.ceil(((1 - this.tokens) / targetRps) * 1000);
    await this.clock.sleep(waitMs);
    this.tokens = 0;
    this.lastRefill = this.clock.now();
  }
}

let processPlane: IngestControlPlane | null = null;

/** Process-wide plane for jobs. Do not use from App Router request handlers. */
export function getJobControlPlane(): IngestControlPlane {
  processPlane ??= new IngestControlPlane();
  return processPlane;
}
