import { test } from "node:test";
import assert from "node:assert/strict";
import { nextMilestoneStep } from "../src/lib/workflow";

test("next action keeps funding, evidence and payment reconciliation distinct", () => {
  const m = {
    status: "PENDING",
    paymentStatus: "UNFUNDED",
    hasSubmission: false,
  };
  assert.equal(nextMilestoneStep(m), "authorize");
  // Evidence alone cannot send an unfunded buyer to payment approval.
  assert.equal(
    nextMilestoneStep({ ...m, status: "IN_REVIEW", hasSubmission: true }),
    "authorize",
  );
  assert.equal(
    nextMilestoneStep({ ...m, paymentStatus: "AUTHORIZED" }),
    "submit",
  );
  assert.equal(
    nextMilestoneStep({
      ...m,
      paymentStatus: "AUTHORIZED",
      hasSubmission: true,
    }),
    "review",
  );
  assert.equal(
    nextMilestoneStep({
      ...m,
      status: "REVISION_REQUESTED",
      paymentStatus: "AUTHORIZED",
      hasSubmission: true,
    }),
    "revise",
  );
  assert.equal(nextMilestoneStep({ ...m, status: "DISPUTED" }), "dispute");
  assert.equal(
    nextMilestoneStep({
      ...m,
      status: "IN_REVIEW",
      paymentStatus: "CAPTURE_PENDING",
      hasSubmission: true,
    }),
    "pending",
  );
  assert.equal(
    nextMilestoneStep({
      ...m,
      status: "RELEASED",
      paymentStatus: "CAPTURED",
      hasSubmission: true,
    }),
    "receipt",
  );
});
