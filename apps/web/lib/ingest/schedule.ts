export const INGEST_TIMEZONE = "America/New_York";
export const INGEST_LOCAL_HOUR = 3;
export const INGEST_LOCAL_MINUTE = 30;

/** Vercel Cron is UTC-only. 08:30 UTC is 3:30 a.m. EST / 4:30 a.m. EDT — always after the SEC ~3:00 a.m. ET bulk. */
export const VERCEL_CRON_UTC = "30 8 * * *";

export type ZoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function partsInTimeZone(date: Date, timeZone = INGEST_TIMEZONE): ZoneParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = INGEST_TIMEZONE,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const got = partsInTimeZone(new Date(utc), timeZone);
    const gotAs = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second);
    const wantAs = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += wantAs - gotAs;
  }
  return new Date(utc);
}

export function easternDateKey(date: Date): string {
  const p = partsInTimeZone(date);
  const mm = String(p.month).padStart(2, "0");
  const dd = String(p.day).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

/** Next automatic bulk window: 3:30 a.m. US Eastern (once per Eastern calendar day). */
export function nextIngestAt(from: Date): Date {
  const p = partsInTimeZone(from);
  const todayRun = zonedLocalToUtc(p.year, p.month, p.day, INGEST_LOCAL_HOUR, INGEST_LOCAL_MINUTE);
  if (todayRun.getTime() > from.getTime()) return todayRun;
  const asUtcMidnight = Date.UTC(p.year, p.month - 1, p.day);
  const next = new Date(asUtcMidnight);
  next.setUTCDate(next.getUTCDate() + 1);
  return zonedLocalToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    INGEST_LOCAL_HOUR,
    INGEST_LOCAL_MINUTE,
  );
}

export function schedulePublic(from = new Date()) {
  const next = nextIngestAt(from);
  return {
    timezone: INGEST_TIMEZONE,
    localTime: `${String(INGEST_LOCAL_HOUR).padStart(2, "0")}:${String(INGEST_LOCAL_MINUTE).padStart(2, "0")}`,
    vercelCronUtc: VERCEL_CRON_UTC,
    nextRunAt: next.toISOString(),
    nextRunEasternDate: easternDateKey(next),
    userImpact:
      "Ingest builds a new copy in the background. People keep using the current copy. A refresh or page change picks up the new copy when it is published.",
  };
}
