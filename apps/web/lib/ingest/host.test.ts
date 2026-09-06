import assert from "node:assert/strict";
import test from "node:test";
import { workerHostPlan } from "./host";

test("this plane is never ready to contact SEC", () => {
  const plan = workerHostPlan({
    TRACE_INGEST_ENABLED: "true",
    TRACE_INGEST_CONFIRM: "TraceMI/0.1",
    TRACE_INGEST_HOST_ROLE: "worker",
  });
  assert.equal(plan.readyToContactSec, false);
  assert.match(plan.whereItRuns, /not Vercel/);
  assert.match(plan.whenReady, /0\.6/);
  assert.ok(plan.doNotRunFrom.includes("Vercel"));
  assert.ok(plan.doNotRunFrom.includes("Cursor cloud agents"));
});

test("Vercel still cannot pass the bulk gate", () => {
  const plan = workerHostPlan({
    TRACE_INGEST_ENABLED: "true",
    TRACE_INGEST_CONFIRM: "TraceMI/0.1",
    TRACE_INGEST_HOST_ROLE: "worker",
    VERCEL: "1",
  });
  assert.equal(plan.liveBulkWouldPassHere, false);
  assert.match(plan.liveBulkBlockReason ?? "", /Vercel/);
});
