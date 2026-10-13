import { workspaceId, judgeDemo } from "./workspace";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./auth";
import {
  authorize,
  capture,
  createAgreement,
  milestone,
  submitWork,
} from "./service";
import {
  browserCriteria,
  browserPolicySchema,
  capturePermission,
  AGENT_TOOLS,
  type AgentResult,
  type AgentTrace,
} from "./agent-contract";
import { AGENT_DEMO_TITLE, demoBrowserPolicy } from "./agent-fixture";
import { openVerificationBrowser } from "./agent-browser";
import { verificationLoop } from "./agent-loop";
import { allowedTarget } from "./agent-network";

export const agentJobSchema = browserPolicySchema
  .omit({ fixture: true })
  .extend({
    sellerEmail: z.string().email().max(254),
    amount: z.number().int().min(100).max(1000000),
  });
export async function createAgentJob(input: unknown, demo = false) {
  const v = agentJobSchema.parse(input);
  const policy = browserPolicySchema.parse({ ...v, fixture: demo });
  allowedTarget(policy.targetUrl);
  if (judgeDemo() && !demo) {
    const allowed = (process.env.DEMO_ALLOWED_ORIGINS || "")
      .split(",")
      .filter(Boolean);
    if (!allowed.includes(new URL(policy.targetUrl).origin))
      throw new ApiError(
        400,
        "This judge demo only inspects the supplied sample or an organizer-configured demo website.",
      );
  }
  const a = await createAgreement(
    {
      title: demo
        ? AGENT_DEMO_TITLE
        : `${policy.heading} · website verification`,
      sellerEmail: v.sellerEmail,
      description:
        "Verify the delivered product page with browser evidence before payment. The buyer controls a milestone-specific capture policy. Only the listed browser requirements are in scope.",
      totalAmount: v.amount + 10000,
      deadline: null,
      aiSource: demo ? "demo" : "fallback",
      plan: {
        riskFlags: [
          "Browser checks are read-only with JavaScript disabled. They do not test checkout transactions.",
          "Automatic capture needs an explicit buyer policy and valid authorization.",
        ],
        milestones: [
          {
            title: "Verified product page",
            description:
              "Inspect the heading, delivery text, purchase destination, and mobile overflow. Preserve screenshots and tool observations.",
            acceptanceCriteria: browserCriteria(policy),
            amount: v.amount,
            dueDate: null,
            aiRiskNotes:
              "Escalate incomplete evidence. Never infer success from seller claims.",
          },
          {
            title: "Handoff and access",
            description:
              "Deliver the source assets and access instructions for manual buyer inspection.",
            acceptanceCriteria: [
              "Provide the final file inventory and buyer access instructions.",
              "Document rollback steps and known limitations.",
            ],
            amount: 10000,
            dueDate: null,
            aiRiskNotes: "Manual buyer approval required.",
          },
        ],
      },
    },
    demo ? "practice" : undefined,
  );
  const m = await db.milestone.findFirstOrThrow({
    where: { agreementId: a.id, position: 0 },
  });
  await db.milestone.update({
    where: { id: m.id },
    data: { browserPolicyJson: JSON.stringify(policy) },
  });
  if (demo) {
    await authorize(m.id);
    // No model or browser is run until the buyer starts verification.
    await db.submission.create({
      data: {
        milestoneId: m.id,
        content:
          "AGENT_FIXTURE_V1: Seller supplied the product page. Please inspect the purchase link.",
        url: policy.targetUrl,
        aiScore: 0,
        aiRecommendation: "revise",
        aiSource: "agent-pending",
        aiReviewJson: JSON.stringify({
          score: 0,
          recommendation: "revise",
          explanation: "Browser verification has not run yet.",
          checklist: browserCriteria(policy).map((_, criterionIndex) => ({
            criterionIndex,
            passed: false,
            evidence: "Awaiting browser verification.",
          })),
          riskFlags: [],
        }),
      },
    });
    await db.milestone.update({
      where: { id: m.id },
      data: { status: "IN_REVIEW" },
    });
  }
  return { id: a.id };
}
export async function seedAgentDemo(fresh = false) {
  if (!fresh) {
    const existing = await db.agreement.findFirst({
      where: {
        workspaceId: workspaceId(),
        title: AGENT_DEMO_TITLE,
        aiSource: "demo",
        paymentMode: "practice",
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return { id: existing.id };
  }
  return createAgentJob(
    {
      ...demoBrowserPolicy,
      sellerEmail: "jamie@studio.example",
      amount: 30000,
    },
    true,
  );
}
export async function setAgentAuthority(
  id: string,
  enabled: boolean,
  confirmed: boolean,
) {
  const m = await milestone(id);
  if (
    !m.browserPolicyJson ||
    ["RELEASED", "DISPUTED"].includes(m.status) ||
    m.paymentStatus === "CAPTURE_PENDING"
  )
    throw new ApiError(409, "This milestone cannot accept a new agent policy.");
  if (enabled && !confirmed)
    throw new ApiError(400, "Explicit buyer confirmation is required.");
  const until = enabled ? new Date(Date.now() + 24 * 3600000) : null;
  await db.$transaction([
    db.milestone.update({
      where: { id },
      data: {
        autoCapture: enabled,
        autoCaptureUntil: until,
        autoCaptureLimit: enabled ? m.amount : 0,
      },
    }),
    db.timelineEvent.create({
      data: {
        agreementId: m.agreementId,
        actor: "buyer",
        type: "AGENT_POLICY",
        message: enabled
          ? `Buyer authorized one ${m.agreement.paymentMode} capture of ${m.amount / 100} USD for this milestone after all four browser checks pass; expires ${until!.toISOString()}.`
          : "Buyer revoked automatic capture. Manual approval required.",
        metadataJson: JSON.stringify({
          milestoneId: id,
          amount: m.amount,
          until,
          enabled,
        }),
      },
    }),
  ]);
  return { ok: true };
}
export async function runAgent(id: string) {
  const m = await milestone(id),
    submission = m.submissions[0];
  if (
    !m.browserPolicyJson ||
    !submission ||
    m.status !== "IN_REVIEW" ||
    m.paymentStatus === "CAPTURE_PENDING"
  )
    throw new ApiError(
      409,
      "A submitted, open browser-verification milestone is required.",
    );
  const policy = browserPolicySchema.parse(JSON.parse(m.browserPolicyJson));
  if (JSON.stringify(browserCriteria(policy)) !== m.acceptanceCriteria)
    throw new ApiError(
      409,
      "Verification requirements no longer match the agreed criteria.",
    );
  if (submission.url !== policy.targetUrl)
    throw new ApiError(
      409,
      "Seller URL must match the buyer-approved verification URL exactly.",
    );
  if (policy.fixture && m.agreement.paymentMode !== "practice")
    throw new ApiError(
      409,
      "Fixture evidence cannot verify a sandbox payment.",
    );
  const run = await db.agentRun.create({
    data: {
      milestoneId: id,
      submissionId: submission.id,
      policyJson: m.browserPolicyJson,
    },
  });
  const trace: AgentTrace[] = [];
  let browser: Awaited<ReturnType<typeof openVerificationBrowser>> | undefined;
  try {
    browser = await openVerificationBrowser(
      policy,
      policy.fixture && submission.content.startsWith("AGENT_FIXTURE_V2:"),
    );
    const loop = await verificationLoop(
      policy,
      browser.execute,
      async (entry) => {
        trace.push(entry);
        await db.agentRun.update({
          where: { id: run.id },
          data: { traceJson: JSON.stringify(trace) },
        });
      },
    );
    const result: AgentResult = {
      ...loop.result,
      blockedRequests: browser.blockedRequests,
      artifactHash: browser.artifactHash,
    };
    const current = await milestone(id);
    if (
      current.submissions[0]?.id !== submission.id ||
      current.browserPolicyJson !== m.browserPolicyJson ||
      current.status !== "IN_REVIEW"
    )
      throw new Error(
        "The submitted work or agreement changed during verification. Run it again.",
      );
    const failed = result.observations.some((o) => !o.passed && !o.error);
    const status =
      result.allPassed && !result.blockedRequests
        ? "VERIFIED"
        : failed
          ? "REVISION_NEEDED"
          : "NEEDS_HUMAN";
    const summary =
      status === "VERIFIED"
        ? "All four browser requirements passed. Checking the buyer's payment policy."
        : status === "REVISION_NEEDED"
          ? "The browser found a concrete failure. Revision feedback was prepared and recorded."
          : "Verification is incomplete. Human inspection is required.";
    const review = {
      score: Math.round(
        (result.observations.filter((o) => o.passed).length / 4) * 100,
      ),
      recommendation: status === "VERIFIED" ? "release" : "revise",
      explanation: summary,
      checklist: AGENT_TOOLS.map((tool, criterionIndex) => {
        const observation = result.observations.find((o) => o.tool === tool);
        return {
          criterionIndex,
          passed: observation?.passed || false,
          evidence:
            observation?.detail || "Not checked. Human review required.",
        };
      }),
      riskFlags: [
        result.scope,
        `Browser snapshot SHA-256: ${result.artifactHash}`,
        ...(result.blockedRequests
          ? [
              `${result.blockedRequests} requests were blocked; automatic capture is disabled.`,
            ]
          : []),
      ],
    };
    await db.$transaction([
      db.agentRun.update({
        where: { id: run.id },
        data: {
          status,
          planner: loop.planner,
          summary,
          resultJson: JSON.stringify(result),
          screenshotsJson: JSON.stringify(browser.screenshots),
          completedAt: new Date(),
        },
      }),
      db.submission.update({
        where: { id: submission.id },
        data: {
          aiScore: review.score,
          aiRecommendation: review.recommendation,
          aiSource: `agent-${loop.planner}`,
          aiReviewJson: JSON.stringify(review),
        },
      }),
      db.timelineEvent.create({
        data: {
          agreementId: m.agreementId,
          actor: "verification agent",
          type: "AGENT_REVIEW",
          message: summary,
          metadataJson: JSON.stringify({
            runId: run.id,
            planner: loop.planner,
            observations: result.observations,
          }),
        },
      }),
    ]);
    await browser.close();
    browser = undefined;
    let decision: string;
    if (status === "REVISION_NEEDED") {
      decision = `Revision requested: ${result.revision}`;
      await db.$transaction([
        db.milestone.update({
          where: { id },
          data: { status: "REVISION_REQUESTED" },
        }),
        db.timelineEvent.create({
          data: {
            agreementId: m.agreementId,
            actor: "verification agent",
            type: "REVISE",
            message: decision,
            metadataJson: JSON.stringify({ runId: run.id, milestoneId: id }),
          },
        }),
      ]);
    } else {
      const denied = capturePermission({
        enabled: current.autoCapture,
        until: current.autoCaptureUntil,
        limit: current.autoCaptureLimit,
        amount: current.amount,
        paymentStatus: current.paymentStatus,
        status: current.status,
        planner: loop.planner,
        paymentMode: m.agreement.paymentMode,
        ...result,
      });
      if (denied) decision = denied;
      else {
        const payment = await capture(
          id,
          `Buyer-delegated capture after browser verification ${run.id}.`,
          run.id,
        );
        decision = payment.pending
          ? "PayPal capture is pending. Human reconciliation required."
          : `${m.agreement.paymentMode === "practice" ? "Simulated payment" : "PayPal sandbox capture"} completed under the buyer's recorded authorization.`;
        await db.agentRun.update({
          where: { id: run.id },
          data: { status: payment.pending ? "CAPTURE_PENDING" : "CAPTURED" },
        });
      }
    }
    trace.push({
      kind: "decision",
      message: decision,
      at: new Date().toISOString(),
    });
    await db.agentRun.update({
      where: { id: run.id },
      data: { traceJson: JSON.stringify(trace), summary: decision },
    });
    return { ok: true, runId: run.id };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 600)
        : "Verification failed.";
    trace.push({ kind: "error", message, at: new Date().toISOString() });
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "NEEDS_HUMAN",
        summary: message,
        traceJson: JSON.stringify(trace),
        completedAt: new Date(),
      },
    });
    return { ok: false, runId: run.id, needsHuman: true };
  } finally {
    await browser?.close().catch(() => {});
  }
}
export async function submitAgentFixtureRevision(id: string) {
  const m = await milestone(id);
  const policy = m.browserPolicyJson
    ? browserPolicySchema.parse(JSON.parse(m.browserPolicyJson))
    : null;
  if (
    !policy?.fixture ||
    m.agreement.paymentMode !== "practice" ||
    m.status !== "REVISION_REQUESTED"
  )
    throw new ApiError(
      409,
      "A requested revision in the agent practice demo is required.",
    );
  return submitWork(
    id,
    m.agreement.sellerToken,
    "AGENT_FIXTURE_V2: Seller corrected the purchase destination. Please recheck all requirements.",
    policy.targetUrl,
  );
}
