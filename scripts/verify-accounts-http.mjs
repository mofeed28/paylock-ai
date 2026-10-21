// Production-route checks with an isolated database, no live provider calls.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
const dir = mkdtempSync(join(tmpdir(), "paylock-accounts-http-"));
const database = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
const base = "http://127.0.0.1:3108";
const code = randomBytes(24).toString("hex");
const password = "Account-test-password-123!";
const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: database,
  AUTH_MODE: "accounts",
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  APP_URL: base,
  BUYER_ACCESS_KEY: code,
  DEMO_MODE: "judges",
  AI_PROVIDER: "openai",
  OPENAI_API_KEY: "",
  OPENAI_BASE_URL: "http://127.0.0.1:1",
  PAYMENT_MODE: "practice",
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "",
  PAYPAL_CLIENT_SECRET: "",
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: "",
  PAYPAL_PLATFORM_CLIENT_ID: "",
  PAYPAL_PLATFORM_CLIENT_SECRET: "",
  PAYPAL_PARTNER_MERCHANT_ID: "",
  PAYPAL_PARTNER_BN_CODE: "",
  AWS_BEARER_TOKEN_BEDROCK: "",
  AWS_ACCESS_KEY_ID: "",
  AWS_SECRET_ACCESS_KEY: "",
};
const db = new PrismaClient({ datasources: { db: { url: database } } });
let child;
const post = (path, cookie, body = {}, extra = {}) =>
  fetch(`${base}/api/${path}`, {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    },
    body: JSON.stringify(body),
  });
const get = (path, cookie) =>
  fetch(`${base}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
const cookieOf = (r) =>
  r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
async function signup(email) {
  const r = await post(
    "auth/sign-up/email",
    null,
    { email, password, name: email.split("@")[0] },
    { "x-paylock-access-code": code },
  );
  assert.equal(r.status, 200, await r.clone().text());
  assert.match(r.headers.get("set-cookie"), /HttpOnly/i);
  return { cookie: cookieOf(r), user: (await r.json()).user };
}
try {
  try {
    await fetch(base, { signal: AbortSignal.timeout(500) });
    throw new Error("Test port occupied");
  } catch (e) {
    if (e.message.includes("occupied")) throw e;
  }
  writeFileSync(join(dir, "test.db"), "");
  execFileSync(
    process.execPath,
    [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
    { env, stdio: "pipe" },
  );
  child = spawn(
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3108",
    ],
    { env, stdio: "ignore", windowsHide: true },
  );
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error("Test server exited");
    try {
      if ((await get("/login")).ok) break;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(
    (await post("login", null, { key: code })).status,
    404,
    "shared-code login cannot bypass accounts",
  );
  assert.equal(
    (
      await post("auth/sign-up/email", null, {
        email: "blocked@example.com",
        password,
        name: "Blocked",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await post(
        "auth/sign-up/email",
        null,
        {},
        { Origin: "https://other.example", "x-paylock-access-code": code },
      )
    ).status,
    403,
  );
  const buyer = await signup("owner@example.com");
  const seller = await signup("worker@example.com");
  const stranger = await signup("other@example.com");
  assert.equal(
    (await post("paypal/seller/connect", null, { consent: true })).status,
    401,
  );
  assert.equal((await post("paypal/seller/refresh", null)).status, 401);
  assert.equal(
    (
      await post(
        "paypal/seller/connect",
        seller.cookie,
        { consent: true },
        { Origin: "https://other.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await post("paypal/seller/connect", seller.cookie, { consent: false }))
      .status,
    400,
  );
  assert.equal(
    (
      await post("paypal/seller/connect", seller.cookie, {
        consent: true,
        userId: buyer.user.id,
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await post("paypal/seller/refresh", stranger.cookie, {
        userId: seller.user.id,
      })
    ).status,
    409,
  );
  assert.equal(
    await db.payPalConnection.count(),
    0,
    "disabled platform never creates connections, even with forged account IDs",
  );
  assert.ok(
    (
      await (
        await get(
          "/account?merchantIdInPayPal=FAKE&permissionsGranted=true",
          seller.cookie,
        )
      ).text()
    ).includes("Your PayPal connection"),
  );
  const created = await post("agreements", buyer.cookie, {
    title: "Private persistent agreement",
    sellerEmail: "worker@example.com",
    description:
      "Deliver the agreed written scope and supporting evidence for review.",
    totalAmount: 1000,
    deadline: null,
    aiSource: "fallback",
    plan: {
      riskFlags: [],
      milestones: ["Scope", "Delivery"].map((title) => ({
        title,
        description: "Deliver the written requirements and evidence.",
        acceptanceCriteria: [
          "Define the deliverables in writing.",
          "List required inputs and dependencies.",
        ],
        amount: 500,
        dueDate: null,
        aiRiskNotes: "",
      })),
    },
  });
  assert.equal(created.status, 200, await created.clone().text());
  const a = await db.agreement.findUniqueOrThrow({
    where: { id: (await created.json()).id },
    include: { milestones: true },
  });
  const m = a.milestones[0];
  const sellerPath = `/seller/${a.sellerToken}?milestone=${a.milestones[1].id}`;
  const anonymous = await get(sellerPath);
  const anonymousBody = await anonymous.text();
  assert.ok(
    anonymous.status === 307 || anonymousBody.includes("NEXT_REDIRECT"),
  );
  assert.ok(!anonymousBody.includes(a.title));
  const invitation = await get(sellerPath, stranger.cookie);
  assert.equal(invitation.status, 200);
  assert.ok(
    !(await invitation.text()).includes("Private persistent agreement"),
    "unapproved invite viewers cannot read agreement content",
  );
  assert.equal(
    (await get(`/api/agreements/${a.id}/export`, stranger.cookie)).status,
    404,
  );
  assert.equal(
    (await post(`milestones/${m.id}/practice-authorize`, seller.cookie)).status,
    404,
  );
  for (const cookie of [seller.cookie, stranger.cookie]) {
    assert.equal(
      (
        await post("paypal/recover-authorization", cookie, {
          milestoneId: m.id,
        })
      ).status,
      404,
      "another account cannot recover the buyer's PayPal authorization",
    );
  }
  assert.equal(
    (await post("paypal/recover-authorization", null, { milestoneId: m.id }))
      .status,
    401,
  );
  assert.equal(
    (
      await post("paypal/recover-authorization", buyer.cookie, {
        milestoneId: m.id,
      })
    ).status,
    409,
    "practice agreements cannot enter PayPal recovery",
  );
  const evidence = {
    milestoneId: m.id,
    content:
      "Scope includes two written deliverables. Inputs are supplied by the buyer.",
  };
  assert.equal(
    (await post(`seller/${a.sellerToken}/submit`, seller.cookie, evidence))
      .status,
    403,
  );
  assert.equal(
    (await post(`seller/${a.sellerToken}/request-access`, seller.cookie))
      .status,
    200,
  );
  const access = await db.sellerAccessRequest.findFirstOrThrow({
    where: { agreementId: a.id },
  });
  assert.equal(
    (
      await post(`agreements/${a.id}/seller-access`, stranger.cookie, {
        action: "approve",
        requestId: access.id,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await post(`agreements/${a.id}/seller-access`, buyer.cookie, {
        action: "approve",
        requestId: access.id,
      })
    ).status,
    200,
  );
  assert.ok(
    (await (await get("/seller", seller.cookie)).text()).includes(a.title),
  );
  assert.equal(
    (await post(`seller/${a.sellerToken}/submit`, buyer.cookie, evidence))
      .status,
    403,
    "buyer preview cannot impersonate seller",
  );
  assert.equal(
    (await post(`seller/${a.sellerToken}/submit`, seller.cookie, evidence))
      .status,
    200,
  );
  assert.equal(
    (
      await post(`milestones/${m.id}/decision`, seller.cookie, {
        action: "revise",
        reason: "Please include further evidence.",
      })
    ).status,
    404,
  );
  await post("auth/sign-out", buyer.cookie);
  assert.equal(
    (await get(`/api/agreements/${a.id}/export`, buyer.cookie)).status,
    401,
  );
  const login = await post("auth/sign-in/email", null, {
    email: "owner@example.com",
    password,
  });
  assert.equal(login.status, 200, await login.clone().text());
  const restored = cookieOf(login);
  assert.equal(
    (await get(`/api/agreements/${a.id}/export`, restored)).status,
    200,
    "sign-in restores prior agreements",
  );
  assert.equal(
    (
      await post(`agreements/${a.id}/seller-access`, restored, {
        action: "renew",
      })
    ).status,
    200,
  );
  const revokedPage = await get(sellerPath, seller.cookie);
  const revokedBody = await revokedPage.text();
  assert.ok(
    revokedPage.status === 404 ||
      revokedBody.includes("NEXT_HTTP_ERROR_FALLBACK;404"),
  );
  assert.ok(!revokedBody.includes(a.title));
  assert.equal(
    (await post(`seller/${a.sellerToken}/submit`, seller.cookie, evidence))
      .status,
    404,
  );
  assert.equal(await db.submission.count({ where: { milestoneId: m.id } }), 1);
  const otherLogin = await post("auth/sign-in/email", null, {
    email: "owner@example.com",
    password,
  });
  assert.equal(otherLogin.status, 200);
  const otherCookie = cookieOf(otherLogin);
  const passwordChange = await post("auth/change-password", restored, {
    currentPassword: password,
    newPassword: "Changed-test-password-456!",
    revokeOtherSessions: true,
  });
  assert.equal(passwordChange.status, 200, await passwordChange.clone().text());
  assert.equal(
    (await get(`/api/agreements/${a.id}/export`, otherCookie)).status,
    401,
    "password change revokes other devices",
  );
  assert.equal(
    (
      await post("auth/sign-in/email", null, {
        email: "owner@example.com",
        password,
      })
    ).status,
    401,
    "previous password no longer works",
  );
  console.log(
    "Account HTTP checks passed: enrollment, CSRF, persistent login, buyer/seller isolation, private invitations, approval, submission and revocation.",
  );
} finally {
  if (child && child.exitCode === null) {
    const stopped = new Promise((r) => child.once("exit", r));
    child.kill();
    await stopped;
  }
  await db.$disconnect();
  rmSync(dir, { recursive: true, force: true });
}
