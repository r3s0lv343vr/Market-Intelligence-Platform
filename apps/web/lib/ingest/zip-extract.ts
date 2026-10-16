import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import yauzl from "yauzl";
import { bronzePath, readBronzeCrc32, writeBronzeStream, ZipSlipError } from "./bronze";

function openZip(zipPath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zip) => {
      if (err || !zip) {
        reject(err ?? new Error("Unable to open zip"));
        return;
      }
      resolve(zip);
    });
  });
}

function openEntry(zip: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (err, stream) => {
      if (err || !stream) {
        reject(err ?? new Error("Unable to read zip entry"));
        return;
      }
      resolve(stream);
    });
  });
}

function skipEntry(fileName: string): boolean {
  if (fileName.endsWith("/")) return true;
  if (fileName.startsWith("__MACOSX/")) return true;
  if (fileName.endsWith(".DS_Store")) return true;
  return false;
}

/**
 * Stream-extract a zip already on disk into write-once bronze.
 * Replay of the same zip skips existing objects instead of duplicating them.
 */
export async function extractZipToBronze(opts: {
  zipPath: string;
  relativePrefix: string;
  sourceUrl: string;
  retrievedAt: string;
  cwd?: string;
}): Promise<{ extracted: number; skipped: number }> {
  const zip = await openZip(opts.zipPath);
  let extracted = 0;
  let skipped = 0;

  await new Promise<void>((resolve, reject) => {
    zip.on("error", reject);
    zip.on("end", resolve);
    zip.readEntry();
    zip.on("entry", (entry: yauzl.Entry) => {
      void (async () => {
        try {
          if (skipEntry(entry.fileName)) {
            zip.readEntry();
            return;
          }
          if (entry.fileName.split(/[/\\]/).some((seg) => seg === "..")) {
            throw new ZipSlipError(`Refusing zip entry: ${entry.fileName}`);
          }
          const base = entry.fileName.split("/").filter(Boolean).at(-1);
          if (!base) {
            zip.readEntry();
            return;
          }
          const relativeName = `${opts.relativePrefix.replace(/\/$/, "")}/${base}`;
          const stream = await openEntry(zip, entry);
          const result = await writeBronzeStream(
            relativeName,
            stream,
            {
              sourceUrl: opts.sourceUrl,
              retrievedAt: opts.retrievedAt,
              entry: entry.fileName,
              crc32: entry.crc32 >>> 0,
            },
            opts.cwd,
            "skip",
          );
          if (result.skipped) skipped += 1;
          else extracted += 1;
          zip.readEntry();
        } catch (err) {
          zip.close();
          reject(err);
        }
      })();
    });
  });

  return { extracted, skipped };
}

/**
 * Apply a newer bulk zip onto an existing live/ tree.
 * Equality is the zip CRC-32 vs the sidecar written on first extract — no second full unpack.
 */
export async function reconcileZipToLive(opts: {
  zipPath: string;
  relativePrefix: string;
  sourceUrl: string;
  retrievedAt: string;
  cwd?: string;
}): Promise<{ changed: number; unchanged: number; added: number }> {
  const zip = await openZip(opts.zipPath);
  let changed = 0;
  let unchanged = 0;
  let added = 0;

  await new Promise<void>((resolve, reject) => {
    zip.on("error", reject);
    zip.on("end", resolve);
    zip.readEntry();
    zip.on("entry", (entry: yauzl.Entry) => {
      void (async () => {
        try {
          if (skipEntry(entry.fileName)) {
            zip.readEntry();
            return;
          }
          if (entry.fileName.split(/[/\\]/).some((seg) => seg === "..")) {
            throw new ZipSlipError(`Refusing zip entry: ${entry.fileName}`);
          }
          const base = entry.fileName.split("/").filter(Boolean).at(-1);
          if (!base) {
            zip.readEntry();
            return;
          }
          const relativeName = `${opts.relativePrefix.replace(/\/$/, "")}/${base}`;
          const crc32 = entry.crc32 >>> 0;
          const dest = bronzePath(relativeName, opts.cwd);
          const prior = readBronzeCrc32(relativeName, opts.cwd);
          if (prior === crc32) {
            unchanged += 1;
            zip.readEntry();
            return;
          }
          const existed = existsSync(dest);
          const stream = await openEntry(zip, entry);
          await writeBronzeStream(
            relativeName,
            stream,
            {
              sourceUrl: opts.sourceUrl,
              retrievedAt: opts.retrievedAt,
              entry: entry.fileName,
              crc32,
            },
            opts.cwd,
            existed ? "replace" : "skip",
          );
          if (existed) changed += 1;
          else added += 1;
          zip.readEntry();
        } catch (err) {
          zip.close();
          reject(err);
        }
      })();
    });
  });

  return { changed, unchanged, added };
}

export async function streamWebBodyToBronze(
  body: ReadableStream<Uint8Array>,
  relativeName: string,
  meta: { sourceUrl: string; retrievedAt: string },
  cwd?: string,
  ifExists: "throw" | "skip" = "skip",
) {
  const nodeStream = Readable.fromWeb(body as unknown as import("node:stream/web").ReadableStream);
  return writeBronzeStream(relativeName, nodeStream, meta, cwd, ifExists);
}

export { createReadStream };
