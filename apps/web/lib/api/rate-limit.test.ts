import assert from "node:assert/strict";
import test from "node:test";
import { READ_API_LIMIT, enforceReadLimit, resetRateLimitForTests } from "./rate-limit";

test("read API allows 60 requests then 429", () => {
  resetRateLimitForTests();
  const req = new Request("http://localhost/api/search", { headers: { "x-real-ip": "203.0.113.9" } });
  for (let i = 0; i < READ_API_LIMIT; i += 1) {
    assert.equal(enforceReadLimit(req), null);
  }
  const blocked = enforceReadLimit(req);
  assert.ok(blocked);
  assert.equal(blocked.status, 429);
});
