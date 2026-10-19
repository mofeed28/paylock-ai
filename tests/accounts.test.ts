import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

test("permanent account sessions and buyer-approved seller access remain isolated and revocable", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paylock-accounts-"));
  process.env.DATABASE_URL = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
  process.env.AUTH_MODE = "accounts";
  process.env.APP_URL = "http://localhost:3199";
  process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("hex");
  writeFileSync(join(dir, "test.db"), "");
  execFileSync(
    process.execPath,
    [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  const { db } = await import("../src/lib/db");
  const { accountAuth } = await import("../src/lib/account-auth");
  const { requestSellerAccess, manageSellerAccess } =
    await import("../src/lib/seller-access");
  const { inWorkspace } = await import("../src/lib/workspace");
  const { createAgreement, milestone } = await import("../src/lib/service");
  const { fallbackPlan } = await import("../src/lib/ai");
  const auth = accountAuth();
  async function request(path: string, body?: object, cookie?: string) {
    return auth.handler(
      new Request(`${process.env.APP_URL}/api/auth/${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          Origin: process.env.APP_URL!,
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  }
  async function signup(email: string) {
    const r = await request("sign-up/email", {
      name: email.split("@")[0],
      email,
      password: "A-long-test-password-123!",
    });
    assert.equal(r.status, 200, await r.clone().text());
    const body = await r.json();
    return {
      user: body.user as { id: string },
      cookie: r.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; "),
    };
  }
  try {
    const buyer = await signup("buyer@example.com");
    const seller = await signup("seller@example.com");
    const stranger = await signup("stranger@example.com");
    const workspace = `account:${buyer.user.id}`;
    const brief = {
      title: "Persistent website project",
      sellerEmail: "seller@example.com",
      description: "Review a website delivery with written scope and evidence",
      totalAmount: 90000,
      deadline: null,
    };
    const agreement = await inWorkspace(workspace, () =>
      createAgreement({
        ...brief,
        plan: fallbackPlan(brief),
        aiSource: "fallback",
      }),
    );
    assert.equal(agreement.buyerName, "buyer");
    const first = await db.milestone.findFirstOrThrow({
      where: { agreementId: agreement.id },
    });
    await assert.rejects(
      inWorkspace(`account:${stranger.user.id}`, () => milestone(first.id)),
      /not found/,
    );
    await request("sign-out", {}, buyer.cookie);
    assert.equal(
      await (await request("get-session", undefined, buyer.cookie)).json(),
      null,
    );
    const login = await request("sign-in/email", {
      email: "buyer@example.com",
      password: "A-long-test-password-123!",
    });
    const loggedIn = await login.json();
    assert.equal(
      loggedIn.user.id,
      buyer.user.id,
      "sign-in restores the same permanent workspace identity",
    );
    assert.equal(
      await db.agreement.count({
        where: { workspaceId: `account:${loggedIn.user.id}` },
      }),
      1,
    );
    await assert.rejects(
      requestSellerAccess(agreement.sellerToken, buyer.user.id),
      /own this agreement/,
    );
    await requestSellerAccess(agreement.sellerToken, seller.user.id);
    await requestSellerAccess(agreement.sellerToken, stranger.user.id);
    const pending = await db.sellerAccessRequest.findFirstOrThrow({
      where: { agreementId: agreement.id, userId: seller.user.id },
    });
    await assert.rejects(
      manageSellerAccess(
        agreement.id,
        `account:${stranger.user.id}`,
        "approve",
        pending.id,
      ),
      /not found/,
    );
    await manageSellerAccess(agreement.id, workspace, "approve", pending.id);
    assert.equal(
      (await db.agreement.findUniqueOrThrow({ where: { id: agreement.id } }))
        .sellerUserId,
      seller.user.id,
    );
    assert.equal(
      (
        await db.sellerAccessRequest.findFirstOrThrow({
          where: { userId: stranger.user.id },
        })
      ).status,
      "DECLINED",
    );
    await assert.rejects(
      manageSellerAccess(agreement.id, workspace, "approve", pending.id),
      /no longer available/,
    );
    await manageSellerAccess(agreement.id, workspace, "renew");
    await assert.rejects(
      requestSellerAccess(agreement.sellerToken, seller.user.id),
      /unavailable/,
    );
    const renewed = await db.agreement.findUniqueOrThrow({
      where: { id: agreement.id },
    });
    assert.equal(renewed.sellerUserId, null);
    assert.equal(
      await db.milestone.count({ where: { agreementId: agreement.id } }),
      4,
      "revocation preserves saved work",
    );
    await db.agreement.update({
      where: { id: agreement.id },
      data: { sellerInviteExpiresAt: new Date(0) },
    });
    await assert.rejects(
      requestSellerAccess(renewed.sellerToken, seller.user.id),
      /expired/,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: seller.user.id } }))
        .emailVerified,
      false,
    );
    assert.notEqual(
      (await db.account.findFirstOrThrow()).password,
      "A-long-test-password-123!",
    );
  } finally {
    await db.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});
