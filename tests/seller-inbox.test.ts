import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("seller inbox discovers private invitations without granting agreement access", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paylock-inbox-"));
  process.env.DATABASE_URL = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
  writeFileSync(join(dir, "test.db"), "");
  execFileSync(
    process.execPath,
    [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  const { db } = await import("../src/lib/db");
  const { sellerInbox } = await import("../src/lib/seller-inbox");
  const { requestSellerAccess, manageSellerAccess } =
    await import("../src/lib/seller-access");
  try {
    for (const id of ["buyer", "seller", "stranger"])
      await db.user.create({
        data: { id, name: id, email: `${id}@example.com` },
      });
    const create = (id: string, extra: object = {}) =>
      db.agreement.create({
        data: {
          id,
          title: "Private title",
          description: "Private scope",
          buyerName: "Private buyer",
          sellerEmail: " Seller@Example.COM ",
          workspaceId: "account:buyer",
          sellerToken: id.padEnd(64, "a"),
          sellerInviteExpiresAt: new Date(Date.now() + 86400000),
          totalAmount: 500,
          paymentMode: "practice",
          aiSource: "fallback",
          riskFlags: "[]",
          ...extra,
        },
      });
    const invited = await create("invited");
    await create("expired", { sellerInviteExpiresAt: new Date(0) });
    await create("self", { workspaceId: "account:seller" });
    await create("demo", { workspaceId: "judge:someone" });
    await create("assigned", { sellerUserId: "stranger" });
    const link = await create("link", { sellerEmail: "different@example.com" });
    let inbox = await sellerInbox("seller");
    assert.deepEqual(
      inbox.invitations.map((i) => i.id),
      [invited.id],
    );
    assert.equal(inbox.agreements.length, 0);
    assert.deepEqual(Object.keys(inbox.invitations[0]).sort(), [
      "accessRequests",
      "createdAt",
      "id",
      "sellerToken",
    ]);
    assert.equal(JSON.stringify(inbox).includes("Private"), false);
    assert.equal((await sellerInbox("stranger")).invitations.length, 0);
    await requestSellerAccess(link.sellerToken, "seller");
    inbox = await sellerInbox("seller");
    assert.equal(
      inbox.invitations.length,
      2,
      "link-based requests stay visible even when contact email differs",
    );
    assert.equal(
      inbox.invitations.find((i) => i.id === link.id)?.accessRequests[0].status,
      "PENDING",
    );
    await requestSellerAccess(invited.sellerToken, "seller");
    const request = await db.sellerAccessRequest.findFirstOrThrow({
      where: { agreementId: invited.id, userId: "seller" },
    });
    await manageSellerAccess(
      invited.id,
      "account:buyer",
      "approve",
      request.id,
    );
    inbox = await sellerInbox("seller");
    assert.equal(inbox.agreements[0].title, "Private title");
    assert.equal(
      inbox.invitations.some((i) => i.id === invited.id),
      false,
    );
    await manageSellerAccess(invited.id, "account:buyer", "renew");
    inbox = await sellerInbox("seller");
    assert.equal(inbox.agreements.length, 0, "renewal revokes full visibility");
    assert.notEqual(
      inbox.invitations.find((i) => i.id === invited.id)?.sellerToken,
      invited.sellerToken,
    );
  } finally {
    await db.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});
