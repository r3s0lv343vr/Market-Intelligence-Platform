import assert from "node:assert/strict";
import test from "node:test";
import { nextIngestAt } from "./schedule";

test("before 3:30 a.m. Eastern, next run is later the same Eastern morning", () => {
  // 2:00 a.m. EDT on 24 Aug 2026 = 06:00 UTC
  const next = nextIngestAt(new Date("2026-08-24T06:00:00.000Z"));
  assert.equal(next.toISOString(), "2026-08-24T07:30:00.000Z");
});

test("after 3:30 a.m. Eastern, next run is the following Eastern morning", () => {
  const next = nextIngestAt(new Date("2026-08-24T08:00:00.000Z"));
  assert.equal(next.toISOString(), "2026-08-25T07:30:00.000Z");
});

test("winter 3:30 a.m. Eastern is 08:30 UTC", () => {
  const next = nextIngestAt(new Date("2026-01-15T07:00:00.000Z"));
  assert.equal(next.toISOString(), "2026-01-15T08:30:00.000Z");
});
