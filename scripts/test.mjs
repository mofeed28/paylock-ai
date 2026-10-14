// Keep a developer's populated .env out of automated provider tests.
// Prisma may load it during import; explicit empty env values prevent that file
// from selecting Bedrock or using real credentials. Tests opt into mock values.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
const env = { ...process.env };
for (const name of [
  "OPENAI_API_KEY",
  "AWS_BEARER_TOKEN_BEDROCK",
  "AWS_PROFILE",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "PAYPAL_CLIENT_ID",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "BUYER_ACCESS_KEY",
  "DEMO_MODE",
  "DEMO_ALLOWED_ORIGINS",
  "DEMO_WEBSITE_URL",
])
  env[name] = "";
Object.assign(env, {
  AI_PROVIDER: "openai",
  PAYMENT_MODE: "practice",
  PAYPAL_ENV: "sandbox",
  OPENAI_BASE_URL: "http://127.0.0.1:1",
  AWS_EC2_METADATA_DISABLED: "true",
});
const files = readdirSync("tests")
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => `tests/${name}`);
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  { env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
