import { createHash } from "node:crypto";
import { ApiError } from "./auth";

// Separate credentials preserve receipts and unfinished orders from the original
// single-merchant app. This integration is sandbox-only, like the existing one.
export function platformConfigured() {
  return (
    process.env.PAYPAL_ENV === "sandbox" &&
    !!(
      process.env.PAYPAL_PLATFORM_CLIENT_ID &&
      process.env.PAYPAL_PLATFORM_CLIENT_SECRET &&
      process.env.PAYPAL_PARTNER_MERCHANT_ID &&
      process.env.PAYPAL_PARTNER_BN_CODE
    )
  );
}
let token: { clientId: string; value: string; expires: number } | undefined;
export async function platformPayPal(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  merchantId?: string,
) {
  if (!platformConfigured())
    throw new ApiError(
      503,
      "Seller connection is awaiting PayPal platform setup. Existing demo receipts remain available.",
    );
  const clientId = process.env.PAYPAL_PLATFORM_CLIENT_ID!;
  if (!token || token.clientId !== clientId || token.expires <= Date.now()) {
    const r = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${process.env.PAYPAL_PLATFORM_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!r.ok)
      throw new ApiError(
        503,
        "PayPal platform authentication is unavailable. Ask the demo operator to check its configuration.",
      );
    const data = await r.json();
    token = {
      clientId,
      value: data.access_token,
      expires: Date.now() + (data.expires_in - 60) * 1000,
    };
  }
  const assertion = merchantId
    ? `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ iss: clientId, payer_id: merchantId })).toString("base64url")}.`
    : undefined;
  const r = await fetch(`https://api-m.sandbox.paypal.com${path}`, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${token.value}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      "PayPal-Partner-Attribution-Id": process.env.PAYPAL_PARTNER_BN_CODE!,
      ...(assertion ? { "PayPal-Auth-Assertion": assertion } : {}),
      ...(key
        ? {
            "PayPal-Request-Id": createHash("sha256")
              .update(key)
              .digest("hex")
              .slice(0, 38),
          }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok)
    throw new ApiError(
      502,
      `PayPal could not verify or process this seller connection (HTTP ${r.status}). No alternative recipient was used.`,
    );
  return r.json();
}
