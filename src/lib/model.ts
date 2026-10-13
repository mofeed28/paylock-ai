import type {
  ConverseCommandInput,
  ConverseCommandOutput,
  Message as BedrockMessage,
} from "@aws-sdk/client-bedrock-runtime";
import { reserveModelCall } from "./demo-limits";

export function modelProvider() {
  const provider = process.env.AI_PROVIDER || "openai";
  if (!["openai", "bedrock"].includes(provider))
    throw new Error("Unsupported AI_PROVIDER");
  return provider;
}
export function modelConfigured() {
  return modelProvider() === "bedrock"
    ? !!(process.env.AWS_REGION && process.env.BEDROCK_MODEL_ID)
    : !!process.env.OPENAI_API_KEY;
}
export function modelName(agent = false) {
  return modelProvider() === "bedrock"
    ? process.env.BEDROCK_MODEL_ID || "Bedrock model not selected"
    : (agent && process.env.OPENAI_AGENT_MODEL) ||
        process.env.OPENAI_MODEL ||
        "gpt-4o-mini";
}
export type ModelMessage = {
  role: string;
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};
type Tool = { name: string; description: string; parameters: object };

async function converse(
  input: Omit<ConverseCommandInput, "modelId">,
): Promise<ConverseCommandOutput> {
  const region = process.env.AWS_REGION || "";
  if (!/^[a-z]{2}(-[a-z]+)+-\d$/.test(region))
    throw new Error("Set a valid AWS_REGION");
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) throw new Error("Set BEDROCK_MODEL_ID");
  const payload = { ...input, modelId };
  await reserveModelCall(payload);
  const signal = AbortSignal.timeout(30000);
  // Bedrock API keys are suitable for the dedicated Lightsail demo. Other hosts
  // can omit the key and use the SDK's IAM role / named profile credential chain.
  if (process.env.AWS_BEARER_TOKEN_BEDROCK) {
    const response = await fetch(
      `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`,
      {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}`,
        },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) throw new Error(`Bedrock HTTP ${response.status}`);
    return response.json();
  }
  const { BedrockRuntimeClient, ConverseCommand } =
    await import("@aws-sdk/client-bedrock-runtime");
  const client = new BedrockRuntimeClient({ region, maxAttempts: 1 });
  try {
    return await client.send(new ConverseCommand(payload), {
      abortSignal: signal,
    });
  } finally {
    client.destroy();
  }
}

async function openai(body: object) {
  await reserveModelCall(body);
  const response = await fetch(
    `${(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
  return response.json();
}

export async function structuredOutput(
  schema: object,
  name: string,
  prompt: string,
  data: unknown,
): Promise<unknown> {
  if (modelProvider() === "bedrock") {
    const result = await converse({
      system: [{ text: prompt }],
      messages: [{ role: "user", content: [{ text: JSON.stringify(data) }] }],
      inferenceConfig: { maxTokens: 4096 },
      toolConfig: {
        tools: [
          {
            toolSpec: {
              name,
              description: "Return the requested structured result.",
              inputSchema: { json: schema as never },
            },
          },
        ],
        toolChoice: { tool: { name } },
      },
    });
    const calls = result.output?.message?.content
      ?.filter((c) => c.toolUse)
      .map((c) => c.toolUse!);
    if (
      result.stopReason !== "tool_use" ||
      calls?.length !== 1 ||
      calls[0].name !== name
    )
      throw new Error("Incomplete Bedrock structured response");
    return calls[0].input;
  }
  const result = await openai({
    model: modelName(),
    max_tokens: 4096,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(data) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name, strict: true, schema },
    },
  });
  if (
    result.choices?.[0]?.finish_reason !== "stop" ||
    result.choices?.[0]?.message?.refusal
  )
    throw new Error("Incomplete model response");
  return JSON.parse(result.choices[0].message.content);
}

export async function chooseTool(
  messages: ModelMessage[],
  tools: Tool[],
): Promise<NonNullable<ModelMessage["tool_calls"]>> {
  if (modelProvider() === "bedrock") {
    const conversation: BedrockMessage[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (m.role === "tool")
          return {
            role: "user",
            content: [
              {
                toolResult: {
                  toolUseId: m.tool_call_id!,
                  content: [{ text: m.content || "" }],
                },
              },
            ],
          };
        if (m.role === "assistant")
          return {
            role: "assistant",
            content: (m.tool_calls || []).map((c) => ({
              toolUse: {
                toolUseId: c.id,
                name: c.function.name,
                input: JSON.parse(c.function.arguments),
              },
            })),
          };
        return { role: "user", content: [{ text: m.content || "" }] };
      });
    const result = await converse({
      system: messages
        .filter((m) => m.role === "system")
        .map((m) => ({ text: m.content || "" })),
      messages: conversation,
      inferenceConfig: { maxTokens: 600 },
      toolConfig: {
        tools: tools.map((t) => ({
          toolSpec: {
            name: t.name,
            description: t.description,
            inputSchema: { json: t.parameters as never },
          },
        })),
        toolChoice: { any: {} },
      },
    });
    if (result.stopReason !== "tool_use")
      throw new Error("Bedrock did not choose a tool");
    const calls = result.output?.message?.content
      ?.filter((c) => c.toolUse)
      .map((c) => c.toolUse!);
    if (
      calls?.length !== 1 ||
      !calls[0].toolUseId ||
      !tools.some((t) => t.name === calls[0].name)
    )
      throw new Error("Invalid Bedrock tool choice");
    return calls.map((c) => ({
      id: c.toolUseId!,
      type: "function",
      function: { name: c.name!, arguments: JSON.stringify(c.input) },
    }));
  }
  const result = await openai({
    model: modelName(true),
    messages,
    max_tokens: 600,
    parallel_tool_calls: false,
    tool_choice: "required",
    tools: tools.map((t) => ({
      type: "function",
      function: { ...t, strict: true },
    })),
  });
  const message = result.choices?.[0]?.message;
  const calls = message?.tool_calls;
  if (
    message?.refusal ||
    calls?.length !== 1 ||
    !calls[0].id ||
    !tools.some((t) => t.name === calls[0].function?.name)
  )
    throw new Error("Invalid tool choice");
  return calls;
}
