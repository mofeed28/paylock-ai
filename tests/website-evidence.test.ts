import { test } from "node:test";
import assert from "node:assert/strict";
import { checkWebsiteSource } from "../src/lib/website-evidence";
import { WEBSITE_CRITERIA, websiteSample } from "../src/lib/website-sample";
import { reviewSubmission, validateReview } from "../src/lib/ai";

test("source checks detect the missing note and fingerprint the corrected artifact", () => {
  const before = checkWebsiteSource(WEBSITE_CRITERIA, websiteSample(false))!;
  const after = checkWebsiteSource(WEBSITE_CRITERIA, websiteSample(true))!;
  assert.deepEqual(
    before.checklist.map((c) => c.passed),
    [true, true, false],
  );
  assert.deepEqual(
    after.checklist.map((c) => c.passed),
    [true, true, true],
  );
  assert.notEqual(before.sha256, after.sha256);
  assert.equal(after.sha256.length, 64);
});

test("claims, comments, scripts and explicitly hidden nodes are not source evidence", () => {
  for (const fake of [
    "<!-- <p>Ships in 2 business days</p> -->",
    '<script>const x = "<p>Ships in 2 business days</p>";</script>',
    "<div hidden><p>Ships in 2 business days</p></div>",
    "<template><p>Ships in 2 business days</p></template>",
    '<p aria-hidden="true">Ships in 2 business days</p>',
  ]) {
    const content = websiteSample(false).replace(
      "<!-- Delivery note still to be added -->",
      fake,
    );
    assert.equal(
      checkWebsiteSource(WEBSITE_CRITERIA, content)!.checklist[2].passed,
      false,
    );
  }
  assert.equal(
    checkWebsiteSource(
      WEBSITE_CRITERIA,
      "I added every requested HTML element. Ships in 2 business days.",
    ),
    null,
  );
});

test("source requirements accept custom products and reject executable purchase links", () => {
  const custom = WEBSITE_CRITERIA.map((c) =>
    c.replace("Northstar Power Bank", "Example Mug"),
  );
  const artifact = websiteSample(true).replace(
    "Northstar Power Bank",
    "Example Mug",
  );
  assert.equal(checkWebsiteSource(custom, artifact)!.checklist[0].passed, true);
  assert.equal(
    checkWebsiteSource(
      WEBSITE_CRITERIA,
      websiteSample(true).replace(
        "https://example.com/checkout",
        "javascript:alert(1)",
      ),
    )!.checklist[1].passed,
    false,
  );
  assert.equal(
    checkWebsiteSource(
      ["The website is responsive and deployed."],
      websiteSample(true),
    ),
    null,
  );
  assert.equal(
    checkWebsiteSource(
      WEBSITE_CRITERIA,
      websiteSample(true) + websiteSample(false),
    ),
    null,
  );
});

test("computed review works without a model and unsupported custom criteria stay failed", async () => {
  delete process.env.OPENAI_API_KEY;
  const before = await reviewSubmission(
    "Website",
    WEBSITE_CRITERIA,
    websiteSample(false),
  );
  assert.equal(before.source, "checks");
  assert.equal(before.review.score, 67);
  assert.equal(before.review.recommendation, "revise");
  const after = await reviewSubmission(
    "Website",
    WEBSITE_CRITERIA,
    websiteSample(true),
  );
  assert.equal(after.review.recommendation, "release");
  const mixed = await reviewSubmission(
    "Website",
    [...WEBSITE_CRITERIA, "Prove that checkout works."],
    websiteSample(true),
  );
  assert.equal(mixed.review.score, 75);
  assert.equal(mixed.review.recommendation, "revise");
});

test("empty model citations cannot support release", () => {
  const review = validateReview(
    {
      score: 100,
      recommendation: "release",
      explanation: "Claimed completion without evidence.",
      riskFlags: [],
      checklist: [{ criterionIndex: 0, passed: true, evidence: "" }],
    },
    ["Prove completion"],
    "Seller claims work is complete.",
  );
  assert.equal(review.recommendation, "revise");
  assert.equal(review.score, 0);
});

test("a live model cannot override a failed source check", async () => {
  const realFetch = globalThis.fetch;
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                score: 100,
                recommendation: "release",
                explanation: "The seller claims all work is complete.",
                riskFlags: [],
                checklist: WEBSITE_CRITERIA.map((_, criterionIndex) => ({
                  criterionIndex,
                  passed: true,
                  evidence:
                    "Product page source submitted for acceptance review.",
                })),
              }),
            },
          },
        ],
      }),
    );
  try {
    const result = await reviewSubmission(
      "Website",
      WEBSITE_CRITERIA,
      websiteSample(false),
    );
    assert.equal(result.source, "live+checks");
    assert.equal(result.review.checklist[2].passed, false);
    assert.equal(result.review.recommendation, "revise");
    assert.equal(result.review.score, 67);
  } finally {
    globalThis.fetch = realFetch;
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
