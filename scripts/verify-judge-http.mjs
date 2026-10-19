// Run after npm run build. Uses an isolated database and dummy credentials;
// never creates a PayPal order or calls an AI provider.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const dir = mkdtempSync(join(tmpdir(), "paylock-http-"));
const database = `file:${join(dir, "demo.db").replaceAll("\\", "/")}`;
const accessCode = randomBytes(24).toString("hex");
const base = "http://127.0.0.1:3107";
const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: database,
  DEMO_MODE: "judges",
  AUTH_MODE: "",
  DEMO_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
  BUYER_ACCESS_KEY: accessCode,
  AI_PROVIDER: "openai",
  OPENAI_API_KEY: "",
  AWS_BEARER_TOKEN_BEDROCK: "",
  PAYMENT_MODE: "sandbox",
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "test-only",
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: "test-only",
  PAYPAL_CLIENT_SECRET: "test-only",
  APP_URL: base,
};
let child;
const db = new PrismaClient({ datasources: { db: { url: database } } });
const post = (path, cookie, body = {}) =>
  fetch(`${base}/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
const get = (path, cookie) =>
  fetch(`${base}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
try {
  try {
    await fetch(base, { signal: AbortSignal.timeout(500) });
    throw new Error("Test port 3107 is already occupied");
  } catch (error) {
    if (error.message.includes("occupied")) throw error;
  }
  writeFileSync(join(dir, "demo.db"), "");
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
      "3107",
    ],
    { env, stdio: "ignore", windowsHide: true },
  );
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error("Test server exited");
    try {
      if ((await get("/login")).ok) break;
    } catch {
      /* waiting for startup */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal((await post("demo")).status, 401);
  assert.equal((await post("login", null, { key: "wrong" })).status, 401);
  const login = async () => {
    const response = await post("login", null, { key: accessCode });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie");
    assert.ok(cookie.includes("HttpOnly") && cookie.includes("Secure"));
    return cookie.split(";")[0];
  };
  const a = await login(),
    b = await login();
  const own = await (await post("demo", a)).json();
  const other = await (await post("demo", b)).json();
  assert.ok(own.id && other.id && own.id !== other.id);
  assert.equal((await get(`/api/agreements/${own.id}/export`, a)).status, 200);
  assert.equal((await get(`/api/agreements/${own.id}/export`, b)).status, 404);
  const agreement = await db.agreement.findUniqueOrThrow({
    where: { id: own.id },
    include: { milestones: true },
  });
  const m = agreement.milestones[0];
  assert.equal((await post(`milestones/${m.id}/review`, b)).status, 404);
  assert.equal(
    (await post("paypal/create-order", b, { milestoneId: m.id })).status,
    404,
  );
  assert.equal(
    (
      await post(`seller/${agreement.sellerToken}/submit`, b, {
        milestoneId: m.id,
        content: "Test evidence for another judge",
      })
    ).status,
    404,
  );
  const privateMarker =
    "Judge A private delivery " + randomBytes(12).toString("hex");
  await db.agreement.update({
    where: { id: own.id },
    data: { description: privateMarker },
  });
  const sellerPage = await (
    await get(`/seller/${agreement.sellerToken}`, b)
  ).text();
  assert.ok(
    !sellerPage.includes(privateMarker),
    "private agreement content must not appear in other session response",
  );
  const ownSellerPage = await (
    await get(`/seller/${agreement.sellerToken}`, a)
  ).text();
  assert.ok(ownSellerPage.includes(privateMarker));
  const dashboard = await (await get("/agreements", b)).text();
  assert.ok(!dashboard.includes(own.id));
  const ledger = await (await get("/ledger", b)).text();
  assert.ok(!ledger.includes(own.id));
  const run = await db.agentRun.create({
    data: {
      milestoneId: m.id,
      submissionId: "test",
      policyJson: "{}",
      screenshotsJson: JSON.stringify([{ data: "dGVzdA==" }]),
    },
  });
  assert.equal(
    (await get(`/api/agent-runs/${run.id}/screenshot/0`, a)).status,
    200,
  );
  assert.equal(
    (await get(`/api/agent-runs/${run.id}/screenshot/0`, b)).status,
    404,
  );
  console.log(
    "Judge HTTP checks passed: login, secure cookies, separate samples, protected exports, seller links, screenshots, ledger and payment mutations.",
  );
} finally {
  if (child && child.exitCode === null) {
    const stopped = new Promise((r) => child.once("exit", r));
    child.kill();
    await stopped;
  }
  await db.$disconnect();
  // dir was created by mkdtemp directly under the OS temporary directory.
  rmSync(dir, { recursive: true, force: true });
}
