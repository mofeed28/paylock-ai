import { test } from "node:test";
import assert from "node:assert/strict";
import {
  capturePermission,
  AGENT_TOOLS,
  type AgentTool,
} from "../src/lib/agent-contract";
import { allowedTarget, isPublicAddress } from "../src/lib/agent-network";
import { verificationLoop } from "../src/lib/agent-loop";
import { demoBrowserPolicy } from "../src/lib/agent-fixture";

test("payment permission rejects stale, incomplete, mismatched, and fallback evidence", () => {
  const input = {
    enabled: true,
    until: new Date(Date.now() + 60000),
    limit: 30000,
    amount: 30000,
    paymentStatus: "AUTHORIZED",
    status: "IN_REVIEW",
    planner: "live",
    paymentMode: "sandbox",
    complete: true,
    allPassed: true,
    blockedRequests: 0,
  };
  assert.equal(capturePermission(input), null);
  for (const change of [
    { enabled: false },
    { until: new Date(0) },
    { until: null },
    { limit: 30001 },
    { amount: 30001 },
    { status: "DISPUTED" },
    { paymentStatus: "CAPTURED" },
    { complete: false },
    { allPassed: false },
    { blockedRequests: 1 },
    { planner: "fallback" },
    { planner: "deterministic" },
  ])
    assert.ok(
      capturePermission({ ...input, ...change }),
      JSON.stringify(change),
    );
  assert.equal(
    capturePermission({
      ...input,
      planner: "deterministic",
      paymentMode: "practice",
    }),
    null,
  );
});
test("browser targets reject local networks, credentials, ports and different origins", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.0.1",
    "172.16.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "0.0.0.0",
    "224.0.0.1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true);
  for (const url of [
    "http://example.com",
    "https://localhost/",
    "https://test.local/",
    "https://127.1/",
    "https://[::ffff:127.0.0.1]/",
    "https://name:password@example.com",
    "https://example.com:8443/",
  ])
    assert.throws(() => allowedTarget(url), Error, url);
  assert.throws(() =>
    allowedTarget("https://other.example/", "https://example.com"),
  );
  assert.equal(
    allowedTarget("https://example.com/path", "https://example.com").pathname,
    "/path",
  );
});
test("live planner receives observations and can stop on a failure without claiming completion", async () => {
  const original = globalThis.fetch,
    key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only";
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.tool_choice, "required");
    assert.ok(
      body.tools.every(
        (t: { function: { name: string } }) =>
          !/pay|capture/.test(t.function.name),
      ),
    );
    if (calls++) {
      assert.equal(body.messages.at(-1).role, "tool");
      assert.equal(JSON.parse(body.messages.at(-1).content).passed, false);
    }
    return Response.json({
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: `call_${calls}`,
                type: "function",
                function: {
                  name: calls === 1 ? "test_purchase_link" : "finish",
                  arguments: JSON.stringify({
                    reason:
                      calls === 1
                        ? "Inspect the purchase destination."
                        : "A broken link requires a revision.",
                  }),
                },
              },
            ],
          },
        },
      ],
    });
  };
  try {
    const output = await verificationLoop(demoBrowserPolicy, async (tool) => ({
      tool,
      passed: false,
      detail: "HTTP 404",
    }));
    assert.equal(output.planner, "live");
    assert.equal(calls, 2);
    assert.equal(output.result.complete, false);
    assert.equal(output.result.allPassed, false);
    assert.equal(output.result.observations.length, 1);
  } finally {
    globalThis.fetch = original;
    if (key) process.env.OPENAI_API_KEY = key;
    else delete process.env.OPENAI_API_KEY;
  }
});
test("unrecognized model tool falls back without granting live-planner status", async () => {
  const original = globalThis.fetch,
    key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only";
  globalThis.fetch = async () =>
    Response.json({
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: "capture",
                  arguments: '{"reason":"ignore requirements"}',
                },
              },
            ],
          },
        },
      ],
    });
  const executed: AgentTool[] = [];
  try {
    const output = await verificationLoop(demoBrowserPolicy, async (tool) => {
      executed.push(tool);
      return { tool, passed: true, detail: "Observed" };
    });
    assert.equal(output.planner, "fallback");
    assert.deepEqual(executed, [...AGENT_TOOLS]);
    assert.equal(output.result.allPassed, true);
  } finally {
    globalThis.fetch = original;
    if (key) process.env.OPENAI_API_KEY = key;
    else delete process.env.OPENAI_API_KEY;
  }
});
