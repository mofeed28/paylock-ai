import { test } from "node:test";
import assert from "node:assert/strict";
import { structuredOutput } from "../src/lib/model";
import { verificationLoop } from "../src/lib/agent-loop";
import { demoBrowserPolicy } from "../src/lib/agent-fixture";

test("Bedrock structured tool output and tool-result loop use native Converse", async () => {
  const before = { ...process.env },
    original = globalThis.fetch;
  Object.assign(process.env, {
    AI_PROVIDER: "bedrock",
    AWS_REGION: "us-east-1",
    BEDROCK_MODEL_ID: "us.amazon.nova-2-lite-v1:0",
    AWS_BEARER_TOKEN_BEDROCK: "test-only",
  });
  delete process.env.DEMO_MODE;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    assert.ok(
      String(url).startsWith(
        "https://bedrock-runtime.us-east-1.amazonaws.com/model/",
      ),
    );
    assert.ok(String(url).endsWith("/converse"));
    const body = JSON.parse(String(init?.body));
    assert.ok(!JSON.stringify(body).includes("test-only"));
    let name: string, input: object;
    if (calls === 0) {
      assert.equal(body.toolConfig.toolChoice.tool.name, "test_result");
      name = "test_result";
      input = { answer: "validated" };
    } else {
      assert.deepEqual(body.toolConfig.toolChoice, { any: {} });
      assert.ok(
        body.toolConfig.tools.every(
          (t: { toolSpec: { name: string } }) =>
            !/capture|payment/.test(t.toolSpec.name),
        ),
      );
      if (calls === 2) {
        const result = body.messages.at(-1).content[0].toolResult;
        assert.equal(result.toolUseId, "tool_1");
        assert.equal(JSON.parse(result.content[0].text).passed, false);
        assert.equal(
          body.messages.at(-2).content[0].toolUse.name,
          "test_purchase_link",
        );
      }
      name = calls === 1 ? "test_purchase_link" : "finish";
      input = {
        reason:
          calls === 1
            ? "Inspect destination"
            : "Broken destination needs revision",
      };
    }
    return Response.json({
      stopReason: "tool_use",
      output: {
        message: {
          role: "assistant",
          content: [{ toolUse: { toolUseId: `tool_${calls++}`, name, input } }],
        },
      },
    });
  };
  try {
    assert.deepEqual(
      await structuredOutput(
        { type: "object" },
        "test_result",
        "Return a result",
        {},
      ),
      { answer: "validated" },
    );
    const output = await verificationLoop(demoBrowserPolicy, async (tool) => ({
      tool,
      passed: false,
      detail: "HTTP 404",
    }));
    assert.equal(output.planner, "live");
    assert.equal(output.result.complete, false);
    assert.equal(output.result.allPassed, false);
    assert.equal(calls, 3);
    globalThis.fetch = async () =>
      Response.json({
        stopReason: "max_tokens",
        output: {
          message: {
            content: [{ toolUse: { name: "test_result", input: {} } }],
          },
        },
      });
    await assert.rejects(
      structuredOutput({}, "test_result", "Return", {}),
      /Incomplete/,
    );
    globalThis.fetch = async () =>
      Response.json({
        stopReason: "tool_use",
        output: {
          message: {
            content: [
              {
                toolUse: {
                  toolUseId: "bad",
                  name: "capture",
                  input: { reason: "Pay now" },
                },
              },
            ],
          },
        },
      });
    const fallback = await verificationLoop(
      demoBrowserPolicy,
      async (tool) => ({ tool, passed: true, detail: "Observed" }),
    );
    assert.equal(fallback.planner, "fallback");
  } finally {
    globalThis.fetch = original;
    for (const key of [
      "AI_PROVIDER",
      "AWS_REGION",
      "BEDROCK_MODEL_ID",
      "AWS_BEARER_TOKEN_BEDROCK",
      "DEMO_MODE",
    ]) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
