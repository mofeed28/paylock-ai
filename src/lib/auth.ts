import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { accountsEnabled, demoAvailable, judgeDemo } from "./workspace";
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
  const workspace = judgeDemo() ? randomBytes(24).toString("hex") : "local";
  const payload = `${expiry}.${workspace}`;
  return `${payload}.${sign(payload)}`;
}
export function sessionWorkspace(value: string): string | null {
  if (!demoAvailable()) return null;
  const [expiry, workspace, sig, extra] = value.split(".");
  if (
    extra ||
    !sig ||
    !Number.isFinite(Number(expiry)) ||
    Number(expiry) <= Date.now()
  )
    return null;
  if (judgeDemo() ? !/^[a-f0-9]{48}$/.test(workspace) : workspace !== "local")
    return null;
  return equal(sig, sign(`${expiry}.${workspace}`)) ? workspace : null;
}
export async function buyerWorkspace(): Promise<string | null> {
  if (accountsEnabled()) {
    const user = await currentAccount();
    return user ? `account:${user.id}` : null;
  }
  if (!demoAvailable()) return null;
  if (!process.env.BUYER_ACCESS_KEY) {
    const h = await headers();
    const host = (h.get("host") || "").split(":")[0];
    const forwarded = (h.get("x-forwarded-host") || host).split(":")[0];
    return ["localhost", "127.0.0.1"].includes(host) &&
      ["localhost", "127.0.0.1"].includes(forwarded)
      ? "local"
      : null;
  }
  const value = (await cookies()).get("paylock-buyer")?.value || "";
  return sessionWorkspace(value);
}
export function roleSession(userId: string) {
  const expiry = String(Date.now() + 8 * 3600000);
  const payload = `role.${expiry}.${userId}`;
  return `${payload}.${sign(payload)}`;
}
export function roleSessionUserId(value: string): string | null {
  if (!accountsEnabled() || !process.env.BUYER_ACCESS_KEY) return null;
  const [prefix, expiry, userId, sig, extra] = value.split(".");
  if (
    prefix !== "role" ||
    extra ||
    !userId ||
    !sig ||
    !Number.isFinite(Number(expiry)) ||
    Number(expiry) <= Date.now()
  )
    return null;
  return equal(sig, sign(`role.${expiry}.${userId}`)) ? userId : null;
}
export async function hasQuickRoleSession() {
  if (!accountsEnabled()) return false;
  const value = (await cookies()).get("paylock-role")?.value || "";
  return !!roleSessionUserId(value);
}
export async function resolveDemoAccount(role: "buyer" | "seller") {
  const { db } = await import("./db");
  const findSeller = async () => {
    const envEmail = process.env.DEMO_SELLER_EMAIL?.trim().toLowerCase();
    if (envEmail) {
      const byEmail = await db.user.findUnique({ where: { email: envEmail } });
      if (byEmail) return byEmail;
    }
    const ready = await db.payPalConnection.findFirst({
      where: { status: "READY" },
      orderBy: { updatedAt: "desc" },
      include: { user: true },
    });
    if (ready) return ready.user;
    const anyConn = await db.payPalConnection.findFirst({
      orderBy: { updatedAt: "desc" },
      include: { user: true },
    });
    if (anyConn) return anyConn.user;
    return db.user.upsert({
      where: { email: envEmail || "seller@demo.paylock.local" },
      update: {},
      create: {
        id: "demo-seller-account",
        name: "Demo Seller",
        email: envEmail || "seller@demo.paylock.local",
      },
    });
  };
  const seller = await findSeller();
  if (role === "seller") return seller;
  const envBuyer = process.env.DEMO_BUYER_EMAIL?.trim().toLowerCase();
  if (envBuyer) {
    const byEmail = await db.user.findUnique({ where: { email: envBuyer } });
    if (byEmail && byEmail.id !== seller.id) return byEmail;
  }
  const latestAgreement = await db.agreement.findFirst({
    where: {
      workspaceId: { startsWith: "account:" },
      NOT: { workspaceId: `account:${seller.id}` },
    },
    orderBy: { createdAt: "desc" },
  });
  if (latestAgreement) {
    const ownerId = latestAgreement.workspaceId.replace(/^account:/, "");
    const owner = await db.user.findUnique({ where: { id: ownerId } });
    if (owner) return owner;
  }
  const otherUser = await db.user.findFirst({
    where: { id: { not: seller.id } },
    orderBy: { createdAt: "asc" },
  });
  if (otherUser) return otherUser;
  return db.user.upsert({
    where: { email: envBuyer || "buyer@demo.paylock.local" },
    update: {},
    create: {
      id: "demo-buyer-account",
      name: "Demo Buyer",
      email: envBuyer || "buyer@demo.paylock.local",
    },
  });
}
export async function connectedDemoSeller() {
  if (!accountsEnabled()) return null;
  const { db } = await import("./db");
  const me = await currentAccount();
  const ready = await db.payPalConnection.findFirst({
    where: {
      status: "READY",
      ...(me ? { userId: { not: me.id } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { user: true },
  });
  if (ready) {
    return {
      id: ready.user.id,
      email: ready.user.email,
      name: ready.user.name,
      merchantId: ready.merchantId,
    };
  }
  const seller = await resolveDemoAccount("seller");
  if (me && seller.id === me.id) return null;
  return {
    id: seller.id,
    email: seller.email,
    name: seller.name,
    merchantId: null,
  };
}
export async function currentAccount() {
  if (!accountsEnabled()) return null;
  const { accountAuth } = await import("./account-auth");
  const sessionUser =
    (await accountAuth().api.getSession({ headers: await headers() }))?.user ??
    null;
  if (sessionUser) return sessionUser;
  const roleCookie = (await cookies()).get("paylock-role")?.value || "";
  const userId = roleSessionUserId(roleCookie);
  if (!userId) return null;
  const { db } = await import("./db");
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
}
export async function isBuyer() {
  return !!(await buyerWorkspace());
}
export async function requireBuyer() {
  if (!(await isBuyer()))
    throw new ApiError(401, "Buyer access required. Sign in to continue.");
}
export async function buyerPage() {
  const workspace = await buyerWorkspace();
  if (!workspace) redirect("/login");
  return workspace;
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
