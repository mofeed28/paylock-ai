import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("seller onboarding verifies ownership and permissions, pins recipient and blocks revoked or changed sellers", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paylock-seller-paypal-"));
  process.env.DATABASE_URL = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
  process.env.AUTH_MODE = "accounts";
  process.env.APP_URL = "http://localhost:3199";
  Object.assign(process.env, {
    PAYPAL_PLATFORM_CLIENT_ID: "platform-test",
    PAYPAL_PLATFORM_CLIENT_SECRET: "secret-test",
    PAYPAL_PARTNER_MERCHANT_ID: "PARTNER1234567",
    PAYPAL_PARTNER_BN_CODE: "test_BN",
    PAYPAL_ENV: "sandbox",
  });
  writeFileSync(join(dir, "test.db"), "");
  execFileSync(
    process.execPath,
    [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  const { db } = await import("../src/lib/db");
  const { startSellerPayPal, refreshSellerPayPal, sellerPayPalStatus } =
    await import("../src/lib/seller-paypal");
  const {
    createAgreement,
    createOrder,
    authorize,
    recoverAuthorization,
    capture,
  } = await import("../src/lib/service");
  const { inWorkspace } = await import("../src/lib/workspace");
  const fetchBefore = global.fetch;
  const calls: {
    path: string;
    method: string;
    body: Record<string, unknown>;
    headers: Headers;
  }[] = [];
  let tracking = "";
  let permissions = true;
  let confirmed = true;
  let statusCode = 200;
  let wrongTracking = false;
  let laterReferral = false;
  let destination = "SELLER1234567";
  let callbackUrl =
    "https://www.sandbox.paypal.com/bizsignup/partner/entry?token=test";
  let savedUnit: Record<string, unknown> = {};
  let wrongPayee = false;
  const referralId = "UmVmZXJyYWw+Lw/==";
  let referralUrl = `https://api-m.sandbox.paypal.com/v2/customer/partner-referrals/${referralId}`;
  global.fetch = async (url, init) => {
    const u = new URL(String(url));
    assert.equal(
      u.hostname,
      "api-m.sandbox.paypal.com",
      "never contact live PayPal",
    );
    const headers = new Headers(init?.headers);
    const body =
      init?.body && String(init.body).startsWith("{")
        ? JSON.parse(String(init.body))
        : {};
    const method = init?.method || "GET";
    calls.push({ path: u.pathname, method, body, headers });
    const response = (data: unknown, status = 200) =>
      Response.json(data, { status });
    if (u.pathname === "/v1/oauth2/token")
      return response({ access_token: "mock-token", expires_in: 3600 });
    assert.equal(headers.get("PayPal-Partner-Attribution-Id"), "test_BN");
    if (u.pathname.startsWith("/v2/customer/partner-referrals")) {
      if (method === "GET")
        assert.equal(
          u.pathname,
          `/v2/customer/partner-referrals/${encodeURIComponent(referralId)}`,
        );
      if (method === "POST") {
        tracking = body.tracking_id;
        assert.equal(body.legal_consents[0].granted, true);
        assert.equal(
          body.partner_config_override.return_url,
          "http://localhost:3199/account?paypal=returned",
        );
        assert.ok(!body.email, "no user email sent implicitly");
      }
      return response({
        links: [
          { rel: "action_url", href: callbackUrl },
          {
            rel: "self",
            href: referralUrl,
          },
        ],
      });
    }
    if (u.pathname.includes("merchant-integrations")) {
      if (statusCode !== 200) return response({}, statusCode);
      const requestedTracking = u.searchParams.get("tracking_id");
      if (requestedTracking) tracking = requestedTracking;
      return response({
        merchant_id: destination,
        tracking_id:
          wrongTracking || (laterReferral && !requestedTracking)
            ? "someone-else"
            : tracking,
        payments_receivable: true,
        primary_email_confirmed: confirmed,
        oauth_integrations: [
          {
            oauth_third_party: [
              {
                partner_client_id: "platform-test",
                scopes: permissions
                  ? [
                      "https://uri.paypal.com/services/payments/payment/authcapture",
                    ]
                  : [],
              },
            ],
          },
        ],
      });
    }
    const assertion = headers.get("PayPal-Auth-Assertion")!;
    assert.ok(assertion);
    assert.deepEqual(
      JSON.parse(Buffer.from(assertion.split(".")[1], "base64url").toString()),
      { iss: "platform-test", payer_id: "SELLER1234567" },
    );
    const unit = () => ({
      ...savedUnit,
      payee: { merchant_id: wrongPayee ? "WRONG12345678" : "SELLER1234567" },
    });
    if (u.pathname === "/v2/checkout/orders") {
      assert.equal(body.purchase_units[0].payee.merchant_id, "SELLER1234567");
      savedUnit = body.purchase_units[0];
      return response({
        id: "order-test",
        status: "CREATED",
        purchase_units: [unit()],
      });
    }
    if (u.pathname === "/v2/checkout/orders/order-test")
      return response({
        id: "order-test",
        status: "APPROVED",
        intent: "AUTHORIZE",
        purchase_units: [unit()],
      });
    if (u.pathname.endsWith("/authorize"))
      return response({
        purchase_units: [
          {
            ...unit(),
            payments: {
              authorizations: [
                {
                  id: "auth-test",
                  status: "CREATED",
                  amount: savedUnit.amount,
                },
              ],
            },
          },
        ],
      });
    if (u.pathname.endsWith("/capture"))
      return response({
        id: "capture-test",
        status: "COMPLETED",
        amount: savedUnit.amount,
      });
    throw new Error(`Unexpected mock request: ${u.pathname}`);
  };
  try {
    for (const id of ["buyer", "seller", "stranger"])
      await db.user.create({
        data: { id, name: id, email: `${id}@example.com` },
      });
    assert.equal((await sellerPayPalStatus("seller")).status, "NOT_CONNECTED");
    await assert.rejects(startSellerPayPal("seller", false), /Confirm/);
    assert.equal(calls.length, 0, "no provider call before consent");
    callbackUrl = "https://evil.example/phishing";
    await assert.rejects(
      startSellerPayPal("seller", true),
      /unexpected onboarding/,
    );
    assert.equal(
      (
        await db.payPalConnection.findUniqueOrThrow({
          where: { userId: "seller" },
        })
      ).referralId,
      null,
    );
    callbackUrl =
      "https://www.sandbox.paypal.com/bizsignup/partner/entry?token=test";
    const validReferralUrl = referralUrl;
    for (const bad of [
      "https://evil.example/v2/customer/partner-referrals/abc=",
      "https://api-m.sandbox.paypal.com/v2/customer/partner-referrals/%252F",
      "https://api-m.sandbox.paypal.com/v2/customer/partner-referrals/abc?unexpected=true",
    ]) {
      referralUrl = bad;
      await assert.rejects(
        startSellerPayPal("seller", true),
        /valid referral reference/,
      );
    }
    referralUrl = validReferralUrl;
    assert.equal((await startSellerPayPal("seller", true)).url, callbackUrl);
    assert.equal(
      (
        await db.payPalConnection.findUniqueOrThrow({
          where: { userId: "seller" },
        })
      ).referralId,
      referralId,
    );
    referralUrl = `https://api-m.sandbox.paypal.com/v2/customer/partner-referrals/${encodeURIComponent(referralId)}`;
    const referralPosts = calls.filter(
      (c) => c.path.endsWith("partner-referrals") && c.method === "POST",
    ).length;
    await startSellerPayPal("seller", true);
    assert.equal(
      calls.filter(
        (c) => c.path.endsWith("partner-referrals") && c.method === "POST",
      ).length,
      referralPosts,
      "reuse the saved referral",
    );
    wrongTracking = true;
    await assert.rejects(
      refreshSellerPayPal("seller"),
      /different seller identity/,
    );
    wrongTracking = false;
    laterReferral = true;
    await assert.rejects(refreshSellerPayPal("seller"), /confirm ownership/);
    assert.equal(
      (
        await db.payPalConnection.findUniqueOrThrow({
          where: { userId: "seller" },
        })
      ).merchantId,
      null,
    );
    laterReferral = false;
    confirmed = false;
    assert.equal(
      (await refreshSellerPayPal("seller")).status,
      "ACTION_REQUIRED",
    );
    confirmed = true;
    permissions = false;
    assert.equal(
      (await refreshSellerPayPal("seller")).status,
      "ACTION_REQUIRED",
    );
    permissions = true;
    assert.equal((await refreshSellerPayPal("seller")).status, "READY");
    laterReferral = true;
    assert.equal(
      (await refreshSellerPayPal("seller")).status,
      "READY",
      "a later referral cannot invalidate an already bound merchant with a matching original lookup",
    );
    wrongTracking = true;
    await assert.rejects(
      refreshSellerPayPal("seller"),
      /different seller identity/,
    );
    wrongTracking = false;
    permissions = false;
    assert.equal(
      (await refreshSellerPayPal("seller")).status,
      "ACTION_REQUIRED",
      "permission checks still apply after re-referral",
    );
    permissions = true;
    laterReferral = false;
    await startSellerPayPal("stranger", true);
    await assert.rejects(refreshSellerPayPal("stranger"), /already connected/);
    await inWorkspace("account:buyer", async () => {
      const agreement = await createAgreement(
        {
          title: "Connected seller test",
          sellerEmail: "seller@example.com",
          description:
            "Deliver a complete written handoff and verification notes.",
          totalAmount: 500,
          deadline: null,
          aiSource: "fallback",
          plan: {
            riskFlags: [],
            milestones: [
              {
                title: "Handoff",
                description: "Deliver the complete handoff",
                acceptanceCriteria: [
                  "Provide file inventory",
                  "Document access instructions",
                ],
                amount: 250,
                dueDate: null,
                aiRiskNotes: "Manual review",
              },
              {
                title: "Follow-up",
                description: "Answer handoff questions",
                acceptanceCriteria: [
                  "Answer all open questions",
                  "Confirm access is working",
                ],
                amount: 250,
                dueDate: null,
                aiRiskNotes: "Manual review",
              },
            ],
          },
        },
        "sandbox",
      );
      assert.equal(agreement.paymentRouting, "seller");
      const m = await db.milestone.findFirstOrThrow({
        where: { agreementId: agreement.id },
      });
      await assert.rejects(createOrder(m.id), /Approve the seller/);
      await db.agreement.update({
        where: { id: agreement.id },
        data: { sellerUserId: "seller" },
      });
      permissions = false;
      await assert.rejects(createOrder(m.id), /finish connecting/);
      permissions = true;
      assert.equal((await createOrder(m.id)).id, "order-test");
      assert.equal(
        (await db.milestone.findUniqueOrThrow({ where: { id: m.id } }))
          .payeeMerchantId,
        "SELLER1234567",
      );
      await db.agreement.update({
        where: { id: agreement.id },
        data: { sellerUserId: "stranger" },
      });
      await assert.rejects(createOrder(m.id), /seller changed/);
      await assert.rejects(authorize(m.id, "order-test"), /seller changed/);
      await db.agreement.update({
        where: { id: agreement.id },
        data: { sellerUserId: "seller" },
      });
      wrongPayee = true;
      await assert.rejects(authorize(m.id, "order-test"), /does not match/);
      await assert.rejects(recoverAuthorization(m.id), /did not match/);
      wrongPayee = false;
      await authorize(m.id, "order-test");
      await db.milestone.update({
        where: { id: m.id },
        data: {
          status: "IN_REVIEW",
          submissions: {
            create: {
              content: "Complete file inventory and access instructions",
              aiScore: 100,
              aiRecommendation: "approve",
              aiSource: "fallback",
              aiReviewJson: "{}",
            },
          },
        },
      });
      permissions = false;
      await assert.rejects(
        capture(m.id, "I reviewed the file inventory."),
        /finish connecting/,
      );
      statusCode = 503;
      await assert.rejects(
        capture(m.id, "I reviewed the file inventory."),
        /HTTP 503/,
      );
      assert.equal(calls.filter((c) => c.path.endsWith("/capture")).length, 0);
      statusCode = 200;
      permissions = true;
      await capture(m.id, "I reviewed the file inventory.");
      await capture(m.id, "Retry after lost response.");
      assert.equal(calls.filter((c) => c.path.endsWith("/capture")).length, 1);
      assert.equal(
        (await db.milestone.findUniqueOrThrow({ where: { id: m.id } }))
          .paymentStatus,
        "CAPTURED",
      );
      destination = "OTHER12345678";
      await assert.rejects(
        refreshSellerPayPal("seller"),
        /different seller identity/,
      );
    });
  } finally {
    global.fetch = fetchBefore;
    await db.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});
