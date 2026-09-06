import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import path from "node:path";
import { USER_AGENT } from "../identity";

export class BronzeImmutableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BronzeImmutableError";
  }
}

export class ZipSlipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipSlipError";
  }
}

export function bronzeRoot(cwd = process.cwd()): string {
  return path.join(cwd, "data", "bronze");
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function safeBronzeRelative(relativeName: string): string {
  const normalized = path.posix.normalize(relativeName.replaceAll("\\", "/"));
  if (path.posix.isAbsolute(normalized) || normalized.startsWith("../") || normalized === "..") {
    throw new ZipSlipError(`Refusing bronze path: ${relativeName}`);
  }
  return normalized;
}

export function bronzePath(relativeName: string, cwd = process.cwd()): string {
  const relative = safeBronzeRelative(relativeName);
  const dest = path.resolve(bronzeRoot(cwd), relative);
  const root = path.resolve(bronzeRoot(cwd));
  if (dest !== root && !dest.startsWith(root + path.sep)) {
    throw new ZipSlipError(`Refusing bronze path: ${relativeName}`);
  }
  return dest;
}

function writeMeta(dest: string, meta: Record<string, unknown>): void {
  writeFileSync(`${dest}.meta.json`, JSON.stringify(meta, null, 2));
}

export function writeBronzeFile(
  relativeName: string,
  bytes: Uint8Array,
  meta: { sourceUrl: string; retrievedAt: string },
  cwd = process.cwd(),
): { path: string; sha256: string; skipped: boolean } {
  const dest = bronzePath(relativeName, cwd);
  if (existsSync(dest)) {
    throw new BronzeImmutableError(
      `Bronze object already exists: ${relativeName}. Rebuild silver from this file; do not refetch to “fix” it.`,
    );
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, bytes);
  const digest = sha256(bytes);
  writeMeta(dest, {
    ...meta,
    sha256: digest,
    userAgent: USER_AGENT,
    bytes: bytes.byteLength,
  });
  return { path: dest, sha256: digest, skipped: false };
}

export async function writeBronzeStream(
  relativeName: string,
  stream: Readable,
  meta: { sourceUrl: string; retrievedAt: string; entry?: string },
  cwd = process.cwd(),
  ifExists: "throw" | "skip" = "throw",
): Promise<{ path: string; sha256: string; skipped: boolean; bytes: number }> {
  const dest = bronzePath(relativeName, cwd);
  if (existsSync(dest)) {
    if (ifExists === "skip") {
      return { path: dest, sha256: "", skipped: true, bytes: 0 };
    }
    throw new BronzeImmutableError(
      `Bronze object already exists: ${relativeName}. Replay skips or rebuilds silver; it does not overwrite bronze.`,
    );
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  const hash = createHash("sha256");
  let bytes = 0;
  const out = createWriteStream(dest);
  stream.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    hash.update(chunk);
  });
  await pipeline(stream, out);
  const digest = hash.digest("hex");
  writeMeta(dest, {
    ...meta,
    sha256: digest,
    userAgent: USER_AGENT,
    bytes,
  });
  return { path: dest, sha256: digest, skipped: false, bytes };
}
