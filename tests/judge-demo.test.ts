import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inWorkspace, workspaceId, demoAvailable } from "../src/lib/workspace";
import { session, sessionWorkspace } from "../src/lib/auth";

test("judge sessions isolate agreements and payment actions, reject forged sessions, and persist model quotas", async () => {
  const dir = mkdtempSync(join(tmpdir(), "paylock-judges-"));
  const before = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: `file:${join(dir, "demo.db").replaceAll("\\", "/")}`,
    DEMO_MODE: "judges",
    BUYER_ACCESS_KEY: "test-only-long-access-code-not-a-secret",
    DEMO_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
  });
  const { db } = await import("../src/lib/db");
  const { seedDemo, milestone, authorize } = await import("../src/lib/service");
  const { reserveModelCall } = await import("../src/lib/demo-limits");
  try {
    writeFileSync(join(dir, "demo.db"), "");
    execFileSync(
      process.execPath,
      [
        resolve("node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
        "--schema",
        resolve("prisma/schema.prisma"),
      ],
      { env: process.env, stdio: "pipe" },
    );
    const first = session(),
      second = session();
    const a = sessionWorkspace(first)!,
      b = sessionWorkspace(second)!;
    assert.ok(a && b && a !== b);
    assert.equal(sessionWorkspace(first.replace(a, b)), null);
    assert.equal(sessionWorkspace(first + ".extra"), null);
    assert.throws(() => workspaceId(), /context required/);
    const one = await inWorkspace(a, () => seedDemo());
    const two = await inWorkspace(b, () => seedDemo());
    assert.notEqual(one.id, two.id);
    assert.equal((await inWorkspace(a, () => seedDemo())).id, one.id);
    const m = await db.milestone.findFirstOrThrow({
      where: { agreementId: one.id },
    });
    await assert.rejects(
      inWorkspace(b, () => milestone(m.id)),
      /not found/,
    );
    await assert.rejects(
      inWorkspace(b, () => authorize(m.id)),
      /not found/,
    );
    assert.equal(
      (await inWorkspace(a, () => milestone(m.id))).agreement.workspaceId,
      a,
    );
    await assert.rejects(
      inWorkspace(a, () => reserveModelCall({ text: "x".repeat(40001) })),
      /input limit/,
    );
    const monthKey = `models:${new Date().toISOString().slice(0, 7)}`;
    const dayKey = `models:${a}:${new Date().toISOString().slice(0, 10)}`;
    await db.demoUsage.create({ data: { key: monthKey, count: 149 } });
    await db.demoUsage.create({ data: { key: dayKey, count: 20 } });
    await assert.rejects(
      inWorkspace(a, () => reserveModelCall({ text: "hello" })),
      /allowance/,
    );
    assert.equal(
      (await db.demoUsage.findUniqueOrThrow({ where: { key: monthKey } }))
        .count,
      149,
      "failed per-session reservation rolls back global slot",
    );
    await inWorkspace(b, () => reserveModelCall({ text: "hello" }));
    await db.$disconnect();
    await assert.rejects(
      inWorkspace(b, () => reserveModelCall({ text: "hello" })),
      /allowance/,
    );
    process.env.DEMO_EXPIRES_AT = new Date(0).toISOString();
    assert.equal(demoAvailable(), false);
    assert.equal(sessionWorkspace(first), null);
    await assert.rejects(
      inWorkspace(a, () => reserveModelCall({})),
      /closed/,
    );
  } finally {
    await db.$disconnect();
    for (const key of [
      "DATABASE_URL",
      "DEMO_MODE",
      "BUYER_ACCESS_KEY",
      "DEMO_EXPIRES_AT",
    ]) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
