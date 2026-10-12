import { randomBytes } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./auth";
import { agreementSchema } from "./schema";
import { reviewSubmission, fallbackReview } from "./ai";
import {
  browserPolicySchema,
  capturePermission,
  type AgentResult,
} from "./agent-contract";
import { paymentMode, paypal } from "./paypal";
import { money } from "./utils";
import {
  WEBSITE_CRITERIA,
  WEBSITE_DEMO_TITLE,
  websiteSample,
} from "./website-sample";
export async function createAgreement(input: unknown, mode = paymentMode()) {
  const v = agreementSchema.parse(input);
  return db.agreement.create({
    data: {
      title: v.title,
      sellerEmail: v.sellerEmail,
      description: v.description,
      totalAmount: v.totalAmount,
      deadline: v.deadline,
      paymentMode: mode,
      aiSource: v.aiSource,
      riskFlags: JSON.stringify(v.plan.riskFlags),
      sellerToken: randomBytes(32).toString("hex"),
      milestones: {
        create: v.plan.milestones.map((m, position) => ({
          ...m,
          position,
          acceptanceCriteria: JSON.stringify(m.acceptanceCriteria),
        })),
      },
      timeline: {
        create: {
          actor: "buyer",
          type: "CREATED",
          message: `Agreement created with ${v.plan.milestones.length} milestones. ${mode === "practice" ? "Practice mode; no money moves." : "PayPal sandbox authorization required."}`,
        },
      },
    },
  });
}
export async function milestone(id: string) {
  const m = await db.milestone.findUnique({
    where: { id },
    include: {
      agreement: true,
      submissions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!m) throw new ApiError(404, "Milestone not found.");
  return m;
}
function assertOpen(m: { status: string; paymentStatus: string }) {
  if (
    ["RELEASED", "DISPUTED"].includes(m.status) ||
    m.paymentStatus === "CAPTURE_PENDING"
  )
    throw new ApiError(
      409,
      "This milestone is closed or has a pending payment. Resolve it before making changes.",
    );
}
export async function submitWork(
  id: string,
  token: string,
  content: string,
  url?: string,
) {
  const m = await milestone(id);
  if (m.agreement.sellerToken !== token)
    throw new ApiError(403, "Invalid seller link.");
  assertOpen(m);
  if (m.status === "IN_REVIEW")
    throw new ApiError(409, "This submission is awaiting a buyer decision.");
  const policy = m.browserPolicyJson
    ? browserPolicySchema.parse(JSON.parse(m.browserPolicyJson))
    : null;
  if (policy && url !== policy.targetUrl)
    throw new ApiError(
      400,
      "Use the buyer-approved website URL exactly. Changing the target requires a new agreement.",
    );
  const result = policy
    ? {
        review: fallbackReview(JSON.parse(m.acceptanceCriteria), content),
        source: "agent-pending",
      }
    : await reviewSubmission(
        m.title,
        JSON.parse(m.acceptanceCriteria),
        content,
        url,
      );
  await db.$transaction(async (tx) => {
    await tx.submission.create({
      data: {
        milestoneId: id,
        content,
        url: url || null,
        aiScore: result.review.score,
        aiRecommendation: result.review.recommendation,
        aiReviewJson: JSON.stringify(result.review),
        aiSource: result.source,
      },
    });
    await tx.milestone.update({ where: { id }, data: { status: "IN_REVIEW" } });
    await tx.timelineEvent.create({
      data: {
        agreementId: m.agreementId,
        actor: "seller",
        type: "SUBMITTED",
        message: `Work submitted for ${m.title}. ${result.source.startsWith("live") ? "AI evidence review completed." : result.source === "checks" ? "HTML source checks completed; no AI model used." : "Fallback review; manual verification required."}`,
      },
    });
  });
  if (policy) {
    const { runAgent } = await import("./agent-service");
    return runAgent(id);
  }
  return { ok: true };
}
export async function rereview(id: string) {
  const m = await milestone(id);
  if (m.browserPolicyJson) {
    const { runAgent } = await import("./agent-service");
    return runAgent(id);
  }
  assertOpen(m);
  const s = m.submissions[0];
  if (!s) throw new ApiError(409, "Submit work before requesting review.");
  const result = await reviewSubmission(
    m.title,
    JSON.parse(m.acceptanceCriteria),
    s.content,
    s.url || undefined,
  );
  await db.$transaction([
    db.submission.update({
      where: { id: s.id },
      data: {
        aiScore: result.review.score,
        aiRecommendation: result.review.recommendation,
        aiReviewJson: JSON.stringify(result.review),
        aiSource: result.source,
      },
    }),
    db.timelineEvent.create({
      data: {
        agreementId: m.agreementId,
        actor: "AI reviewer",
        type: "REVIEWED",
        message: `Evidence review rerun for ${m.title} (${result.source}).`,
        metadataJson: JSON.stringify(result),
      },
    }),
  ]);
  return { ok: true };
}
export async function decide(
  id: string,
  action: "revise" | "dispute" | "reopen",
  reason: string,
) {
  const m = await milestone(id);
  if (action === "reopen") {
    if (m.status !== "DISPUTED")
      throw new ApiError(409, "Only disputed milestones can be reopened.");
  } else {
    assertOpen(m);
    if (!m.submissions.length)
      throw new ApiError(409, "A submission is required before a decision.");
  }
  const next = action === "dispute" ? "DISPUTED" : "REVISION_REQUESTED";
  await db.$transaction([
    db.milestone.update({ where: { id }, data: { status: next } }),
    db.timelineEvent.create({
      data: {
        agreementId: m.agreementId,
        actor: "buyer",
        type: action.toUpperCase(),
        message: `${action === "revise" ? "Revision requested" : action === "dispute" ? "Internal dispute opened" : "Dispute resolved; new submission requested"} · ${m.title}: ${reason}`,
        metadataJson: JSON.stringify({ milestoneId: id, reason }),
      },
    }),
  ]);
  return { ok: true };
}
export async function createOrder(id: string) {
  const m = await milestone(id);
  assertOpen(m);
  if (m.paymentStatus !== "UNFUNDED")
    throw new ApiError(
      409,
      "This milestone is already authorized or captured.",
    );
  if (m.agreement.paymentMode === "practice")
    throw new ApiError(
      409,
      "Use the practice authorization action for this agreement.",
    );
  if (m.orderId) return { id: m.orderId };
  const key = `order:${id}`;
  const raw = await paypal(
    "/v2/checkout/orders",
    "POST",
    {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: id,
          custom_id: id,
          description: m.title.slice(0, 127),
          amount: { currency_code: "USD", value: (m.amount / 100).toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: "NO_SHIPPING",
            user_action: "CONTINUE",
          },
        },
      },
    },
    key,
  );
  if (!raw.id) throw new ApiError(502, "PayPal did not return an order ID.");
  await db.$transaction([
    db.paymentEvent.upsert({
      where: { operationKey: key },
      create: {
        operationKey: key,
        agreementId: m.agreementId,
        milestoneId: id,
        provider: "paypal-sandbox",
        providerOrderId: raw.id,
        type: "ORDER",
        amount: m.amount,
        status: raw.status,
        rawJson: JSON.stringify(raw),
      },
      update: { rawJson: JSON.stringify(raw), status: raw.status },
    }),
    db.milestone.update({ where: { id }, data: { orderId: raw.id } }),
  ]);
  return { id: raw.id };
}
export async function authorize(id: string, orderId?: string) {
  const m = await milestone(id);
  assertOpen(m);
  if (m.paymentStatus === "AUTHORIZED") return { ok: true };
  if (m.paymentStatus !== "UNFUNDED")
    throw new ApiError(409, "Payment state does not allow authorization.");
  const practice = m.agreement.paymentMode === "practice";
  let authId = `practice-auth-${id}`;
  let expires = new Date(Date.now() + 29 * 86400000);
  let raw: unknown = { simulated: true };
  if (!practice) {
    if (!orderId || orderId !== m.orderId)
      throw new ApiError(400, "Order does not belong to this milestone.");
    const result = await paypal(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`,
      "POST",
      {},
      `auth:${id}`,
    );
    raw = result;
    const unit = result.purchase_units?.[0];
    const auth = unit?.payments?.authorizations?.[0];
    if (
      !auth?.id ||
      auth.status !== "CREATED" ||
      unit.reference_id !== id ||
      auth.amount?.currency_code !== "USD" ||
      Math.round(Number(auth.amount?.value) * 100) !== m.amount
    )
      throw new ApiError(
        502,
        "Authorization details could not be verified. No local balance was changed.",
      );
    authId = auth.id;
    expires = new Date(auth.expiration_time || expires);
  }
  const key = `auth:${id}`;
  await db.$transaction([
    db.paymentEvent.upsert({
      where: { operationKey: key },
      create: {
        operationKey: key,
        agreementId: m.agreementId,
        milestoneId: id,
        provider: practice ? "practice" : "paypal-sandbox",
        providerOrderId: m.orderId,
        providerAuthorizationId: authId,
        type: "AUTHORIZE",
        amount: m.amount,
        status: "COMPLETED",
        rawJson: JSON.stringify(raw),
      },
      update: {},
    }),
    db.milestone.update({
      where: { id },
      data: {
        paymentStatus: "AUTHORIZED",
        authorizationId: authId,
        authorizedAt: new Date(),
        expiresAt: expires,
      },
    }),
    db.timelineEvent.create({
      data: {
        agreementId: m.agreementId,
        actor: "buyer",
        type: "AUTHORIZED",
        message: `${money(m.amount)} authorized for ${m.title}${practice ? " (practice; no funds held)" : " in PayPal sandbox"}.`,
      },
    }),
  ]);
  return { ok: true };
}
export async function capture(id: string, reason: string, agentRunId?: string) {
  const m = await milestone(id);
  if (m.paymentStatus === "CAPTURED")
    return { ok: true, alreadyCaptured: true };
  if (m.status !== "IN_REVIEW" || !m.submissions.length)
    throw new ApiError(
      409,
      "A submitted milestone awaiting review is required for release.",
    );
  if (!["AUTHORIZED", "CAPTURE_PENDING"].includes(m.paymentStatus))
    throw new ApiError(409, "Authorize this milestone before release.");
  if (
    m.expiresAt &&
    m.expiresAt < new Date() &&
    m.paymentStatus !== "CAPTURE_PENDING"
  )
    throw new ApiError(
      409,
      "Authorization expired. Reauthorization is not supported in this MVP; create a new agreement.",
    );
  if (agentRunId) {
    const run = await db.agentRun.findUnique({ where: { id: agentRunId } });
    if (
      !run ||
      run.milestoneId !== id ||
      run.submissionId !== m.submissions[0]?.id ||
      run.policyJson !== m.browserPolicyJson ||
      run.status !== "VERIFIED" ||
      !run.completedAt ||
      Date.now() - run.completedAt.getTime() > 10 * 60000
    )
      throw new ApiError(
        409,
        "Fresh verification bound to the current submission is required.",
      );
    const evidence = JSON.parse(run.resultJson) as AgentResult;
    const denied = capturePermission({
      enabled: m.autoCapture,
      until: m.autoCaptureUntil,
      limit: m.autoCaptureLimit,
      amount: m.amount,
      paymentStatus: m.paymentStatus,
      status: m.status,
      planner: run.planner,
      paymentMode: m.agreement.paymentMode,
      ...evidence,
    });
    if (denied) throw new ApiError(409, denied);
  }
  const practice = m.agreement.paymentMode === "practice";
  const key = `capture:${id}`;
  const previous = await db.paymentEvent.findUnique({
    where: { operationKey: key },
  });
  let raw: unknown = { simulated: true, status: "COMPLETED" };
  let captureId = `practice-cap-${id}`;
  let status = "COMPLETED";
  if (!practice) {
    const result = previous?.providerCaptureId
      ? await paypal(
          `/v2/payments/captures/${encodeURIComponent(previous.providerCaptureId)}`,
          "GET",
        )
      : await paypal(
          `/v2/payments/authorizations/${encodeURIComponent(m.authorizationId!)}/capture`,
          "POST",
          {
            amount: {
              currency_code: "USD",
              value: (m.amount / 100).toFixed(2),
            },
            final_capture: true,
          },
          key,
        );
    raw = result;
    captureId = result.id;
    status = result.status;
    if (
      !captureId ||
      result.amount?.currency_code !== "USD" ||
      Math.round(Number(result.amount?.value) * 100) !== m.amount
    )
      throw new ApiError(
        502,
        "PayPal capture details could not be verified. Retry to reconcile.",
      );
  }
  await db.$transaction(async (tx) => {
    await tx.paymentEvent.upsert({
      where: { operationKey: key },
      create: {
        operationKey: key,
        agreementId: m.agreementId,
        milestoneId: id,
        provider: practice ? "practice" : "paypal-sandbox",
        providerOrderId: m.orderId,
        providerAuthorizationId: m.authorizationId,
        providerCaptureId: captureId,
        type: "CAPTURE",
        amount: m.amount,
        status,
        rawJson: JSON.stringify(raw),
      },
      update: { status, rawJson: JSON.stringify(raw) },
    });
    await tx.milestone.update({
      where: { id },
      data: {
        captureId,
        paymentStatus: status === "COMPLETED" ? "CAPTURED" : "CAPTURE_PENDING",
        ...(status === "COMPLETED" ? { status: "RELEASED" } : {}),
      },
    });
    await tx.timelineEvent.create({
      data: {
        agreementId: m.agreementId,
        actor: agentRunId ? "verification agent" : "buyer",
        type: status === "COMPLETED" ? "RELEASED" : "CAPTURE_PENDING",
        message: `${status === "COMPLETED" ? "Approved and captured" : "Capture awaiting provider confirmation"}: ${money(m.amount)} · ${m.title}${practice ? " (practice)" : ""}. Buyer note: ${reason}`,
        metadataJson: JSON.stringify({
          captureId,
          agentRunId,
          submissionId: m.submissions[0].id,
          reason,
        }),
      },
    });
    const remaining = await tx.milestone.count({
      where: { agreementId: m.agreementId, status: { not: "RELEASED" } },
    });
    if (remaining === 0)
      await tx.agreement.update({
        where: { id: m.agreementId },
        data: { status: "COMPLETED" },
      });
  });
  return { ok: status === "COMPLETED", pending: status !== "COMPLETED" };
}
export async function seedDemo(fresh = false) {
  if (!fresh) {
    const existing = await db.agreement.findFirst({
      where: {
        title: WEBSITE_DEMO_TITLE,
        aiSource: "demo",
        paymentMode: "practice",
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return { id: existing.id };
  }
  const a = await createAgreement(
    {
      title: WEBSITE_DEMO_TITLE,
      sellerEmail: "jamie@studio.example",
      totalAmount: 90000,
      description:
        "Deliver a product page for Northstar's power bank. First inspect the HTML requirements, then inspect the rendered layout and handoff. Each milestone requires buyer approval.",
      deadline: null,
      aiSource: "demo",
      plan: {
        riskFlags: [
          "Sample artifacts and simulated payments. HTML checks do not verify a deployed store.",
          "Authorize each milestone near delivery.",
        ],
        milestones: [
          {
            title: "Product page source",
            amount: 30000,
            description:
              "Deliver the product heading, purchase link, and delivery note in the submitted HTML source.",
            acceptanceCriteria: WEBSITE_CRITERIA,
            dueDate: null,
            aiRiskNotes:
              "Source checks establish presence only. Inspect checkout and rendered layout separately.",
          },
          {
            title: "Responsive layout and QA",
            amount: 40000,
            description:
              "Provide desktop and mobile evidence and document the functional checkout test.",
            acceptanceCriteria: [
              "Provide screenshots at 390px and 1440px viewport widths.",
              "Document a sandbox checkout test with its transaction reference.",
            ],
            dueDate: null,
            aiRiskNotes: "Buyer must inspect screenshots and the actual store.",
          },
          {
            title: "Launch handoff",
            amount: 20000,
            description:
              "Deliver the final assets, access instructions, and rollback steps.",
            acceptanceCriteria: [
              "List delivered files and buyer access instructions.",
              "Document rollback steps and remaining limitations.",
            ],
            dueDate: null,
            aiRiskNotes: "Deployment is not automatically verified.",
          },
        ],
      },
    },
    "practice",
  );
  const m = await db.milestone.findFirstOrThrow({
    where: { agreementId: a.id, position: 0 },
  });
  await authorize(m.id);
  await submitWork(m.id, a.sellerToken, websiteSample(false));
  return { id: a.id };
}
export async function submitDemoRevision(id: string) {
  const m = await milestone(id);
  if (
    m.agreement.aiSource !== "demo" ||
    m.agreement.title !== WEBSITE_DEMO_TITLE ||
    m.agreement.paymentMode !== "practice" ||
    m.position !== 0
  )
    throw new ApiError(
      403,
      "Sample revisions are only available for the practice walkthrough.",
    );
  if (m.status !== "REVISION_REQUESTED")
    throw new ApiError(
      409,
      "Request a revision before submitting the corrected sample.",
    );
  return submitWork(id, m.agreement.sellerToken, websiteSample(true));
}
