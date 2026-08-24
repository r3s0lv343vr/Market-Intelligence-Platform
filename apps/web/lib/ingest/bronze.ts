import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { USER_AGENT } from "../identity";

export class BronzeImmutableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BronzeImmutableError";
  }
}

export function bronzeRoot(cwd = process.cwd()): string {
  return path.join(cwd, "data", "bronze");
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Write-once bronze object. A second write of the same name is a bug, not an overwrite.
 */
export function writeBronzeFile(
  relativeName: string,
  bytes: Uint8Array,
  meta: { sourceUrl: string; retrievedAt: string },
  cwd = process.cwd(),
): { path: string; sha256: string } {
  const dest = path.join(bronzeRoot(cwd), relativeName);
  if (existsSync(dest)) {
    throw new BronzeImmutableError(`Bronze object already exists: ${relativeName}. Rebuild silver from this file; do not refetch to “fix” it.`);
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, bytes);
  const digest = sha256(bytes);
  writeFileSync(
    `${dest}.meta.json`,
    JSON.stringify(
      {
        ...meta,
        sha256: digest,
        userAgent: USER_AGENT,
        bytes: bytes.byteLength,
      },
      null,
      2,
    ),
  );
  return { path: dest, sha256: digest };
}
