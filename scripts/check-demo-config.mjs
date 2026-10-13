// Run with node --env-file=/etc/paylock.env scripts/check-demo-config.mjs.
// Report only field names and conditions; never values or credentials.
const e = process.env;
const checks = {
  "DEMO_MODE must be judges": e.DEMO_MODE === "judges",
  "PAYMENT_MODE and PAYPAL_ENV must be sandbox":
    e.PAYMENT_MODE === "sandbox" && e.PAYPAL_ENV === "sandbox",
  "PayPal credentials must be present and client IDs must match":
    !!e.PAYPAL_CLIENT_SECRET &&
    !!e.PAYPAL_CLIENT_ID &&
    e.PAYPAL_CLIENT_ID === e.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  "BUYER_ACCESS_KEY must be a non-placeholder secret of at least 24 characters":
    !!e.BUYER_ACCESS_KEY &&
    e.BUYER_ACCESS_KEY.length >= 24 &&
    !e.BUYER_ACCESS_KEY.includes("REPLACE_"),
  "DEMO_EXPIRES_AT must be a future timestamp":
    Date.parse(e.DEMO_EXPIRES_AT || "") > Date.now(),
  "APP_URL must use HTTPS and a configured hostname":
    /^https:\/\/[a-z0-9.-]+\/?$/i.test(e.APP_URL || "") &&
    !e.APP_URL?.includes("YOUR_"),
  "AI_PROVIDER must be bedrock": e.AI_PROVIDER === "bedrock",
  "AWS_REGION must be configured": !!e.AWS_REGION,
  "BEDROCK_MODEL_ID must be configured": !!e.BEDROCK_MODEL_ID,
  "Bedrock authentication must be configured": !!(
    e.AWS_BEARER_TOKEN_BEDROCK ||
    e.AWS_PROFILE ||
    e.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
    e.AWS_ACCESS_KEY_ID
  ),
  "DATABASE_URL must use the persistent demo directory":
    e.DATABASE_URL === "file:/var/lib/paylock/demo.db",
};
const errors = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([message]) => message);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "Judge demo configuration checks passed. Provider connectivity still requires testing.",
  );
