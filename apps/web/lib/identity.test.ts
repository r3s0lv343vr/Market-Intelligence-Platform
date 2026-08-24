import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_TOKEN, CONTACT_EMAIL, PLATFORM_NAME, USER_AGENT } from "./identity";

test("locked User-Agent is identified and not a generic client", () => {
  assert.equal(USER_AGENT, "TraceMI/0.1 (Trace Market Intelligence; tracemarketintelligence@gmail.com)");
  assert.equal(AGENT_TOKEN, "TraceMI/0.1");
  assert.equal(PLATFORM_NAME, "Trace Market Intelligence");
  assert.equal(CONTACT_EMAIL, "tracemarketintelligence@gmail.com");
});
