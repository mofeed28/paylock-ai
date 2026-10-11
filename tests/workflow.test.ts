import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
test("complete isolated SQLite workflow: evidence, revision, dispute, authorization, idempotent capture", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paylock-test-"));
  process.env.DATABASE_URL = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
  delete process.env.OPENAI_API_KEY;
  const { db } = await import("../src/lib/db");
  const {
    seedDemo,
    submitDemoRevision,
    milestone,
    capture,
    decide,
    submitWork,
    authorize,
    createOrder,
    createAgreement,
  } = await import("../src/lib/service");
  const { fallbackPlan } = await import("../src/lib/ai");
  try {
    const migrationDir = resolve("prisma/migrations");
    for (const name of readdirSync(migrationDir)
      .filter((x) => x !== "migration_lock.toml")
      .sort()) {
      const sql = readFileSync(
        join(migrationDir, name, "migration.sql"),
        "utf8",
      );
      for (const statement of sql
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean))
        await db.$executeRawUnsafe(statement);
    }
    const a = await seedDemo();
    const first = (
      await db.milestone.findMany({
        where: { agreementId: a.id },
        orderBy: { position: "asc" },
      })
    )[0];
    const agreement = await db.agreement.findUniqueOrThrow({
      where: { id: a.id },
    });
    assert.equal(agreement.totalAmount, 90000);
    assert.equal(first.paymentStatus, "AUTHORIZED");
    assert.equal(first.status, "IN_REVIEW");
    assert.equal(
      (await seedDemo()).id,
      a.id,
      "reopening does not duplicate the demo",
    );
    assert.equal((await milestone(first.id)).submissions[0].aiScore, 67);
    await assert.rejects(submitDemoRevision(first.id), /Request a revision/);

    await decide(
      first.id,
      "revise",
      "Please include a complete mobile comparison.",
    );
    await assert.rejects(
      capture(first.id, "I approve this work."),
      /awaiting review/,
    );
    await assert.rejects(
      submitWork(first.id, "invalid", "My complete revised evidence report."),
      /Invalid seller/,
    );
    await submitWork(
      first.id,
      agreement.sellerToken,
      "Revised audit with mobile comparison and detailed findings.",
    );
    const revised = await milestone(first.id);
    assert.equal(revised.submissions.length, 2);
    assert.equal(revised.submissions[0].aiSource, "fallback");
    assert.equal(revised.submissions[0].aiRecommendation, "revise");
    await decide(
      first.id,
      "dispute",
      "The provided evidence contradicts the scope.",
    );
    await assert.rejects(
      capture(first.id, "I approve this work."),
      /awaiting review/,
    );
    await assert.rejects(
      submitWork(
        first.id,
        agreement.sellerToken,
        "More evidence with details and findings.",
      ),
      /closed/,
    );
    await decide(
      first.id,
      "reopen",
      "Scope confirmed; please supply the missing evidence.",
    );
    await submitWork(
      first.id,
      agreement.sellerToken,
      "Here is the final corrected audit with all mobile evidence.",
    );
    await capture(
      first.id,
      "Manually inspected the complete audit and verified all three criteria.",
    );
    await capture(first.id, "Repeated request after response loss.");
    assert.equal((await milestone(first.id)).status, "RELEASED");
    assert.equal(
      await db.paymentEvent.count({
        where: { milestoneId: first.id, type: "CAPTURE" },
      }),
      1,
    );
    await assert.rejects(
      decide(first.id, "dispute", "Trying to change released work."),
      /closed/,
    );
    const fresh = await seedDemo(true);
    assert.notEqual(fresh.id, a.id);
    const demoMilestone = await db.milestone.findFirstOrThrow({
      where: { agreementId: fresh.id, position: 0 },
    });
    await decide(
      demoMilestone.id,
      "revise",
      "Please add the missing delivery note.",
    );
    await submitDemoRevision(demoMilestone.id);
    const corrected = await milestone(demoMilestone.id);
    assert.equal(corrected.submissions.length, 2);
    assert.equal(corrected.submissions[0].aiScore, 100);
    assert.equal(corrected.submissions[0].aiSource, "checks");
    await assert.rejects(
      submitDemoRevision(demoMilestone.id),
      /Request a revision/,
    );
    const second = await db.milestone.findFirstOrThrow({
      where: { agreementId: a.id, position: 1 },
    });
    await submitWork(
      second.id,
      agreement.sellerToken,
      "Draft copy and layout recommendations for all requested sections.",
    );
    await assert.rejects(
      capture(second.id, "I approve the new copy."),
      /Authorize/,
    );
    await assert.rejects(createOrder(second.id), /practice/);
    await authorize(second.id);
    await authorize(second.id);
    assert.equal(
      await db.paymentEvent.count({
        where: { milestoneId: second.id, type: "AUTHORIZE" },
      }),
      1,
    );
    await db.milestone.update({
      where: { id: second.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await assert.rejects(
      capture(second.id, "I approve the new copy."),
      /expired/,
    );
    // Exercise the real adapter with a deterministic PayPal HTTP double. This
    // verifies request contracts and pending reconciliation, not live connectivity.
    const brief = {
      title: "Sandbox integration test",
      sellerEmail: "seller@example.com",
      totalAmount: 90000,
      deadline: null,
      description:
        "Build a Shopify product page audit with detailed comparison evidence.",
    };
    const sandbox = await createAgreement(
      { ...brief, plan: fallbackPlan(brief), aiSource: "fallback" },
      "sandbox",
    );
    const sm = await db.milestone.findFirstOrThrow({
      where: { agreementId: sandbox.id, position: 0 },
    });
    process.env.PAYPAL_CLIENT_ID = "test-client";
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID = "test-client";
    process.env.PAYPAL_CLIENT_SECRET = "test-secret";
    process.env.PAYPAL_ENV = "sandbox";
    const realFetch = globalThis.fetch;
    const requests: {
      url: string;
      body: Record<string, unknown>;
      key: string | null;
    }[] = [];
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      const body =
        init?.body && headers.get("Content-Type") === "application/json"
          ? JSON.parse(String(init.body))
          : {};
      requests.push({ url, body, key: headers.get("PayPal-Request-Id") });
      if (url.endsWith("/oauth2/token"))
        return Response.json({ access_token: "test-token", expires_in: 3600 });
      if (url.endsWith("/checkout/orders")) {
        assert.equal(body.intent, "AUTHORIZE");
        return Response.json({ id: "ORDER_TEST", status: "CREATED" });
      }
      if (url.endsWith("/ORDER_TEST/authorize"))
        return Response.json({
          purchase_units: [
            {
              reference_id: sm.id,
              payments: {
                authorizations: [
                  {
                    id: "AUTH_TEST",
                    status: "CREATED",
                    amount: { currency_code: "USD", value: "200.00" },
                    expiration_time: new Date(
                      Date.now() + 86400000,
                    ).toISOString(),
                  },
                ],
              },
            },
          ],
        });
      if (url.endsWith("/AUTH_TEST/capture")) {
        assert.equal(body.final_capture, true);
        return Response.json({
          id: "CAP_TEST",
          status: "PENDING",
          amount: { currency_code: "USD", value: "200.00" },
        });
      }
      if (url.endsWith("/captures/CAP_TEST"))
        return Response.json({
          id: "CAP_TEST",
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "200.00" },
        });
      throw new Error(`Unexpected provider call: ${url}`);
    };
    try {
      await createOrder(sm.id);
      await createOrder(sm.id);
      assert.equal(
        requests.filter((r) => r.url.endsWith("/checkout/orders")).length,
        1,
      );
      await assert.rejects(authorize(sm.id, "ORDER_OTHER"), /does not belong/);
      await authorize(sm.id, "ORDER_TEST");
      await submitWork(
        sm.id,
        sandbox.sellerToken,
        "Detailed audit submitted with comparisons and priorities for review.",
      );
      const pending = await capture(
        sm.id,
        "Buyer manually inspected the submitted evidence.",
      );
      assert.equal(pending.pending, true);
      assert.equal((await milestone(sm.id)).status, "IN_REVIEW");
      assert.equal((await milestone(sm.id)).paymentStatus, "CAPTURE_PENDING");
      await assert.rejects(
        decide(sm.id, "dispute", "Provider result is still pending."),
        /pending payment/,
      );
      const done = await capture(
        sm.id,
        "Buyer checked the provider capture status.",
      );
      assert.equal(done.ok, true);
      await capture(sm.id, "Repeated click after a completed capture.");
      assert.equal(
        requests.filter((r) => r.url.endsWith("/AUTH_TEST/capture")).length,
        1,
      );
      assert.equal((await milestone(sm.id)).status, "RELEASED");
      assert.ok(
        requests
          .filter((r) =>
            /checkout\/orders$|\/authorize$|\/AUTH_TEST\/capture$/.test(r.url),
          )
          .every((r) => r.key && r.key.length <= 38),
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  } finally {
    await db.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});
