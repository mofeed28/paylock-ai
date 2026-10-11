import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function sign(value: string) {
  return createHmac("sha256", process.env.BUYER_ACCESS_KEY || "local")
    .update(value)
    .digest("hex");
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function session() {
  const expiry = String(Date.now() + 8 * 3600000);
  return `${expiry}.${sign(expiry)}`;
}
export async function isBuyer() {
  if (!process.env.BUYER_ACCESS_KEY) {
    const h = await headers();
    const host = (h.get("host") || "").split(":")[0];
    const forwarded = (h.get("x-forwarded-host") || host).split(":")[0];
    return (
      ["localhost", "127.0.0.1"].includes(host) &&
      ["localhost", "127.0.0.1"].includes(forwarded)
    );
  }
  const value = (await cookies()).get("paylock-buyer")?.value || "";
  const [expiry, sig] = value.split(".");
  return !!sig && Number(expiry) > Date.now() && equal(sig, sign(expiry));
}
export async function requireBuyer() {
  if (!(await isBuyer()))
    throw new ApiError(401, "Buyer access required. Sign in to continue.");
}
export async function buyerPage() {
  if (!(await isBuyer())) redirect("/login");
}
export function guardOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const own = `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`;
  if (origin && origin !== own && origin !== process.env.APP_URL)
    throw new ApiError(403, "Cross-origin request blocked.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new ApiError(403, "Cross-site request blocked.");
}
const hits = new Map<string, { start: number; count: number }>();
export function rateLimit(request: Request) {
  const key = request.headers.get("x-forwarded-for") || "local";
  const now = Date.now();
  if (hits.size > 1000) hits.clear();
  const row = hits.get(key);
  if (!row || now - row.start > 60000) hits.set(key, { start: now, count: 1 });
  else if (++row.count > 60)
    throw new ApiError(429, "Too many requests. Please wait a minute.");
}
// A single-process SQLite MVP serializes mutations. See README for multi-instance requirements.
const state = globalThis as unknown as { paylockQueue?: Promise<unknown> };
export async function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const prior = state.paylockQueue || Promise.resolve();
  let done!: () => void;
  state.paylockQueue = new Promise<void>((r) => {
    done = r;
  });
  await prior.catch(() => {});
  try {
    return await fn();
  } finally {
    done();
  }
}
