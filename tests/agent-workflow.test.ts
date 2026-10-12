import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test(
  "real browser revision loop preserves evidence and captures only under buyer permission",
  { timeout: 120000 },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "paylock-agent-test-"));
    process.env.DATABASE_URL = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
    delete process.env.OPENAI_API_KEY;
    const { db } = await import("../src/lib/db");
    const {
      seedAgentDemo,
      setAgentAuthority,
      runAgent,
      submitAgentFixtureRevision,
    } = await import("../src/lib/agent-service");
    const { milestone, capture, submitWork } =
      await import("../src/lib/service");
    try {
      const migrationDir = resolve("prisma/migrations");
      for (const name of readdirSync(migrationDir)
        .filter((n) => n !== "migration_lock.toml")
        .sort())
        for (const statement of readFileSync(
          join(migrationDir, name, "migration.sql"),
          "utf8",
        )
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean))
          await db.$executeRawUnsafe(statement);
      const demo = await seedAgentDemo();
      const m = await db.milestone.findFirstOrThrow({
        where: { agreementId: demo.id, position: 0 },
      });
      await assert.rejects(
        setAgentAuthority(m.id, true, false),
        /confirmation/,
      );
      await setAgentAuthority(m.id, true, true);
      const first = await runAgent(m.id);
      assert.equal(
        first.ok,
        true,
        (await db.agentRun.findUniqueOrThrow({ where: { id: first.runId } }))
          .summary,
      );
      assert.equal((await milestone(m.id)).status, "REVISION_REQUESTED");
      assert.equal(
        await db.paymentEvent.count({
          where: { milestoneId: m.id, type: "CAPTURE" },
        }),
        0,
      );
      const run = await db.agentRun.findUniqueOrThrow({
        where: { id: first.runId },
      });
      const evidence = JSON.parse(run.resultJson);
      assert.equal(evidence.complete, true);
      assert.equal(evidence.blockedRequests, 0);
      assert.equal(
        evidence.observations.filter((o: { passed: boolean }) => o.passed)
          .length,
        3,
      );
      assert.match(evidence.revision, /HTTP 404/);
      assert.equal(JSON.parse(run.screenshotsJson).length, 3);
      assert.equal(run.planner, "deterministic");
      await assert.rejects(runAgent(m.id), /submitted, open/);
      await setAgentAuthority(m.id, false, false);
      await submitAgentFixtureRevision(m.id);
      assert.equal(
        (await milestone(m.id)).status,
        "IN_REVIEW",
        "revoked permission must require manual approval",
      );
      assert.equal(
        await db.paymentEvent.count({
          where: { milestoneId: m.id, type: "CAPTURE" },
        }),
        0,
      );
      const good = await db.agentRun.findFirstOrThrow({
        where: { milestoneId: m.id },
        orderBy: { createdAt: "desc" },
      });
      assert.equal(good.status, "VERIFIED");
      assert.equal(JSON.parse(good.resultJson).allPassed, true);
      await setAgentAuthority(m.id, true, true);
      await db.agentRun.update({
        where: { id: good.id },
        data: { completedAt: new Date(Date.now() - 11 * 60000) },
      });
      await assert.rejects(
        capture(m.id, "Old evidence must not authorize capture.", good.id),
        /verification|stale|fresh|evidence/i,
      );
      const final = await runAgent(m.id);
      assert.equal(final.ok, true);
      assert.equal((await milestone(m.id)).status, "RELEASED");
      assert.equal((await milestone(m.id)).submissions.length, 2);
      assert.equal(
        (await db.agentRun.findUniqueOrThrow({ where: { id: final.runId } }))
          .status,
        "CAPTURED",
      );
      await capture(m.id, "Retry after response loss.", final.runId);
      assert.equal(
        await db.paymentEvent.count({
          where: { milestoneId: m.id, type: "CAPTURE" },
        }),
        1,
      );
      await assert.rejects(
        setAgentAuthority(m.id, true, true),
        /cannot accept/,
      );
      const newDemo = await seedAgentDemo(true);
      const other = await db.milestone.findFirstOrThrow({
        where: { agreementId: newDemo.id, position: 0 },
      });
      await db.milestone.update({
        where: { id: other.id },
        data: { status: "REVISION_REQUESTED" },
      });
      const agreement = await db.agreement.findUniqueOrThrow({
        where: { id: newDemo.id },
      });
      await assert.rejects(
        submitWork(
          other.id,
          agreement.sellerToken,
          "Changed URL must never be inspected.",
          "https://example.com/",
        ),
        /buyer-approved/,
      );
    } finally {
      await db.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
