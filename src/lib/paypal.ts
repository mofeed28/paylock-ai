import { createHash } from "node:crypto";
import { ApiError } from "./auth";
const base = "https://api-m.sandbox.paypal.com";
let token: { value: string; expires: number } | null = null;
export function paymentMode() {
  return process.env.PAYMENT_MODE === "sandbox" ? "sandbox" : "practice";
}
export function paypalConfigured() {
  return !!(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_ID === process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_ENV === "sandbox"
  );
}
async function accessToken() {
  if (!paypalConfigured())
    throw new ApiError(
      503,
      "Configure matching PayPal sandbox client IDs, client secret, and PAYPAL_ENV=sandbox in .env.",
    );
  if (token && token.expires > Date.now()) return token.value;
  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok)
    throw new ApiError(
      502,
      "PayPal sandbox authentication failed. Check your server credentials.",
    );
  const data = await r.json();
  token = {
    value: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };
  return token.value;
}
export async function paypal(
  path: string,
  method = "POST",
  body?: unknown,
  key?: string,
) {
  const auth = await accessToken();
  const r = await fetch(`${base}${path}`, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${auth}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(key
        ? {
            "PayPal-Request-Id": createHash("sha256")
              .update(key)
              .digest("hex")
              .slice(0, 38),
          }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new ApiError(
      502,
      `PayPal sandbox could not complete the request (${data.name || r.status}). Retry safely; no practice payment was substituted.`,
    );
  return data;
}
