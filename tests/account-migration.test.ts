import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

test("account migration preserves pre-existing agreements, milestones and payment receipts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paylock-migration-"));
  const url = `file:${join(dir, "existing.db").replaceAll("\\", "/")}`;
  const migrations = join(dir, "migrations");
  mkdirSync(migrations);
  for (const entry of readdirSync("prisma/migrations")) {
    if (
      ![
        "20261018000000_persistent_accounts",
        "20261021100000_seller_paypal",
      ].includes(entry)
    )
      cpSync(join("prisma/migrations", entry), join(migrations, entry), {
        recursive: true,
      });
  }
  cpSync("prisma/schema.prisma", join(dir, "schema.prisma"));
  writeFileSync(join(dir, "existing.db"), "");
  const migrate = () =>
    execFileSync(
      process.execPath,
      [
        resolve("node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
        "--schema",
        join(dir, "schema.prisma"),
      ],
      { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" },
    );
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    migrate();
    await db.$executeRawUnsafe(
      `INSERT INTO Agreement (id,title,sellerEmail,sellerToken,description,totalAmount,paymentMode,aiSource,riskFlags,workspaceId) VALUES ('legacy','Saved project','seller@example.com','legacy-token','Saved scope',500,'sandbox','live','[]','old-workspace')`,
    );
    await db.$executeRawUnsafe(
      `INSERT INTO Milestone (id,agreementId,position,title,description,acceptanceCriteria,amount,aiRiskNotes,paymentStatus,captureId) VALUES ('legacy-m','legacy',0,'Saved milestone','Saved scope','[]',500,'','CAPTURED','saved-capture')`,
    );
    await db.$executeRawUnsafe(
      `INSERT INTO PaymentEvent (id,agreementId,milestoneId,provider,providerCaptureId,operationKey,type,amount,status,rawJson) VALUES ('legacy-p','legacy','legacy-m','paypal','saved-capture','old-capture-key','CAPTURE',500,'COMPLETED','{}')`,
    );
    cpSync(
      "prisma/migrations/20261018000000_persistent_accounts",
      join(migrations, "20261018000000_persistent_accounts"),
      { recursive: true },
    );
    cpSync(
      "prisma/migrations/20261021100000_seller_paypal",
      join(migrations, "20261021100000_seller_paypal"),
      { recursive: true },
    );
    migrate();
    const saved = await db.agreement.findUniqueOrThrow({
      where: { id: "legacy" },
      include: { milestones: true, payments: true },
    });
    assert.equal(saved.workspaceId, "old-workspace");
    assert.equal(saved.paymentRouting, "legacy");
    assert.equal(saved.milestones[0].payeeMerchantId, null);
    assert.equal(
      saved.sellerUserId,
      null,
      "legacy agreements are not silently assigned to new accounts",
    );
    assert.equal(saved.milestones[0].captureId, "saved-capture");
    assert.equal(saved.payments[0].providerCaptureId, "saved-capture");
    assert.equal(saved.payments[0].amount, 500);
    assert.deepEqual(await db.$queryRawUnsafe("PRAGMA foreign_key_check"), []);
  } finally {
    await db.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
});
