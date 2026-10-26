"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Flag,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { AgreementView } from "@/lib/data";
import type { Review } from "@/lib/schema";
import { money, date, timestamp } from "@/lib/utils";
import { Button } from "./ui/button";
import { api, CopyButton, Notice, Status } from "./common";
import { AgentPanel } from "./agent-panel";
import { PayPalButton } from "./paypal-button";
import { nextMilestoneStep } from "@/lib/workflow";
import { SellerAccess } from "./seller-access";
import { extractHtml, WEBSITE_DEMO_TITLE } from "@/lib/website-sample";
export function AgreementDetail({
  agreement: a,
  initialMilestone,
  paypalClientId,
  paypalPartnerCode,
  judgeDemo = false,
  accounts = false,
}: {
  agreement: AgreementView;
  initialMilestone?: string;
  paypalClientId: string;
  paypalPartnerCode?: string;
  judgeDemo?: boolean;
  accounts?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    initialMilestone ||
      a.milestones.find((m) => m.status === "IN_REVIEW")?.id ||
      a.milestones[0].id,
  );
  const [tab, setTab] = useState("Milestones");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [action, setAction] = useState<
    "release" | "revise" | "dispute" | "reopen" | null
  >(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const m = a.milestones.find((m) => m.id === selected) || a.milestones[0];
  const sub = m.submissions[0];
  const review: Review | undefined = sub
    ? JSON.parse(sub.aiReviewJson)
    : undefined;
  const criteria: string[] = JSON.parse(m.acceptanceCriteria);
  const released = a.milestones.filter((m) => m.status === "RELEASED").length;
  const authorized = a.milestones
    .filter((m) => m.paymentStatus === "AUTHORIZED")
    .reduce((n, m) => n + m.amount, 0);
  const captured = a.milestones
    .filter((m) => m.paymentStatus === "CAPTURED")
    .reduce((n, m) => n + m.amount, 0);
  const practice = a.paymentMode === "practice";
  const websiteDemo =
    practice &&
    a.aiSource === "demo" &&
    a.title === WEBSITE_DEMO_TITLE &&
    m.position === 0;
  const nextStep = nextMilestoneStep({ ...m, hasSubmission: !!sub });
  const latestRun = m.agentRuns.find((r) => r.submissionId === sub?.id);
  const browserFixture = m.browserPolicyJson
    ? !!JSON.parse(m.browserPolicyJson).fixture
    : false;
  const html = sub ? extractHtml(sub.content) : null;
  const passedCount = review?.checklist.filter((c) => c.passed).length || 0;
  const missingEvidence = !!review && passedCount < criteria.length;
  const evidenceComplete = m.browserPolicyJson
    ? !!latestRun && ["VERIFIED", "CAPTURED"].includes(latestRun.status)
    : !!review && !missingEvidence;
  const receipt = a.payments.find(
    (p) =>
      p.milestoneId === m.id &&
      p.type === "CAPTURE" &&
      p.status === "COMPLETED",
  );
  async function run(path: string, data: unknown, label: string) {
    setBusy(label);
    setError("");
    setSuccess("");
    try {
      const result = await api<{ pending?: boolean }>(path, data);
      setAction(null);
      setReason("");
      setConfirmed(false);
      setSuccess(
        result.pending
          ? "Capture is pending with PayPal. Check the payment status again before taking another action."
          : "Saved. Your agreement and timeline are up to date.",
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function choose(next: typeof action) {
    setAction(next);
    setReason("");
    setConfirmed(false);
    setError("");
  }
  return (
    <div className="page focused-detail">
      <Link className="back-link" href="/agreements">
        <ArrowLeft size={15} />
        All agreements
      </Link>
      <div className="page-heading detail-heading">
        <div>
          <div className="eyebrow">
            BUYER VIEW · AGREEMENT {a.id.slice(-8).toUpperCase()}
          </div>
          <h1>{a.title}</h1>
          <p>
            <span className="mini-avatar">
              {a.sellerEmail.slice(0, 2).toUpperCase()}
            </span>{" "}
            Seller: {a.sellerEmail}
            <span className="dot-separator">·</span>Created {date(a.createdAt)}
          </p>
        </div>
        <div className="button-row">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/agreements/${a.id}/export`}>
              <Download size={15} />
              Evidence packet
            </a>
          </Button>
          <Status value={a.status} />
        </div>
      </div>
      <div className="role-switch">
        <span>
          <strong>You’re the buyer</strong> · Set requirements and decide
          payment
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href={`/seller/${a.sellerToken}?milestone=${m.id}`}>
            {accounts ? "Preview seller view" : "Switch to seller view"}{" "}
            <ArrowRight size={15} />
          </Link>
        </Button>
      </div>
      {accounts && <SellerAccess agreement={a} milestone={m.id} />}
      <details className="agreement-access">
        <summary>Requirements, access & demo roles</summary>
        <section
          className="agreement-context"
          aria-label="Agreement roles and access"
        >
          <div>
            <strong>Requirements</strong>
            <span>
              {a.aiSource === "demo"
                ? "Prepared example for this walkthrough"
                : "Set and confirmed by you, the buyer"}
            </span>
          </div>
          <div>
            <strong>Who can see this?</strong>
            <span>
              {judgeDemo
                ? "Only this demo session. Other judges have separate workspaces."
                : accounts
                  ? "Your buyer account and the seller account you approve. Agreements are not publicly listed."
                  : "Buyer access; the private seller link opens this agreement’s submission view."}
            </span>
          </div>
          <div>
            <strong>Seller view</strong>
            <span>
              {judgeDemo
                ? "Play the seller in this same session. No invitation has been sent."
                : "Share the submission link with the seller. No invitation is sent automatically."}
            </span>
            <Link
              className="text-link"
              href={`/seller/${a.sellerToken}?milestone=${m.id}`}
            >
              {judgeDemo ? "Try seller view" : "Open seller view"}{" "}
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </details>
      <div className="environment-note">
        <span className="green-dot" />
        {practice
          ? "Practice agreement · no real funds are held or transferred"
          : "PayPal sandbox · authorization and capture with test funds"}
        <span className="note-right">
          {m.browserPolicyJson
            ? "Your policy controls payment."
            : "AI advises. You approve."}
        </span>
      </div>
      <ol className="workflow-strip" aria-label="Milestone progress">
        {[
          "Requirements set",
          "Buyer authorizes",
          "Seller submits · AI reviews",
          "Payment decision",
        ].map((label, i) => {
          const complete =
            i === 0 ||
            (i === 1 &&
              ["AUTHORIZED", "CAPTURE_PENDING", "CAPTURED"].includes(
                m.paymentStatus,
              )) ||
            (i === 2 && evidenceComplete) ||
            (i === 3 && m.status === "RELEASED");
          return (
            <li className={complete ? "complete" : ""} key={label}>
              <span>{complete ? <Check size={15} /> : i + 1}</span>
              {label}
            </li>
          );
        })}
      </ol>
      <div className="compact-balance">
        <span>{money(a.totalAmount)} agreement</span>
        <span>{money(authorized)} authorized</span>
        <span>
          {money(captured)} captured · {released}/{a.milestones.length}{" "}
          milestones paid
        </span>
      </div>
      <div className="detail-tabs tabs">
        {["Milestones", "Activity", "Agreement details"].map((t) => (
          <button
            className={tab === t ? "selected" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Activity" && <span>{a.timeline.length}</span>}
          </button>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      {tab === "Milestones" && (
        <section
          className={`next-action next-action-${nextStep}`}
          aria-label="Your next step"
        >
          <div className="next-action-copy">
            <span className="eyebrow">
              YOUR NEXT STEP · MILESTONE {m.position + 1}
            </span>
            <h2>
              {nextStep === "authorize"
                ? `Authorize ${money(m.amount)} with ${practice ? "practice funds" : "PayPal"}`
                : nextStep === "submit"
                  ? accounts
                    ? "Ready for your seller’s delivery"
                    : "Now try the seller’s side"
                  : nextStep === "revise"
                    ? accounts
                      ? "Waiting for the seller’s revision"
                      : "Send the revised delivery"
                    : nextStep === "receipt"
                      ? `${money(m.amount)} payment recorded`
                      : nextStep === "pending"
                        ? "PayPal is processing the capture"
                        : nextStep === "dispute"
                          ? "Resolve the open dispute"
                          : "Review the evidence, then decide"}
            </h2>
            <p>
              {nextStep === "authorize"
                ? "Start here. Authorizing funds and allowing automatic payment are separate steps. You can keep manual approval."
                : nextStep === "submit"
                  ? accounts
                    ? "Your funds are authorized. Your assigned seller can now submit evidence against your requirements."
                    : "Your funds are authorized. Switch roles to submit the work against the requirements you set."
                  : nextStep === "revise"
                    ? accounts
                      ? "The previous evidence stays in the record. Your seller can submit a corrected version from their inbox."
                      : "The previous evidence stays in the record. Submit a corrected version for another review."
                    : nextStep === "receipt"
                      ? `${practice ? "Simulated payment" : "PayPal sandbox capture"} complete. The receipt and supporting evidence are saved with this agreement.`
                      : nextStep === "pending"
                        ? "Check the existing payment status before taking another action."
                        : nextStep === "dispute"
                          ? "Payment release is blocked while this internal dispute is open."
                          : "Inspect the findings and screenshots. You can approve payment or request a specific revision."}
            </p>
            <span className="next-milestone">
              {m.title} · {money(m.amount)}
            </span>
          </div>
          <div className="next-action-control">
            {m.paymentStatus === "UNFUNDED" &&
              m.status !== "DISPUTED" &&
              (practice ? (
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() =>
                    run(
                      `milestones/${m.id}/practice-authorize`,
                      {},
                      "Authorizing…",
                    )
                  }
                >
                  <LockKeyhole size={15} />
                  {busy || `Simulate authorization · ${money(m.amount)}`}
                </Button>
              ) : a.paymentRouting === "seller" &&
                (!a.sellerUser?.paypalConnection?.merchantId ||
                  a.sellerUser.paypalConnection.status !== "READY" ||
                  !paypalClientId) ? (
                <Notice>
                  {!a.sellerUserId
                    ? "Invite your seller above and wait for them to accept."
                    : !paypalClientId
                      ? "Seller payments are awaiting PayPal platform setup by the demo operator."
                      : "Ask your seller to open Account → PayPal connection and finish connecting. Then refresh this page."}{" "}
                  Payment stays blocked until PayPal verifies the recipient.
                </Notice>
              ) : paypalClientId ? (
                <>
                  <p className="muted">
                    Use a Personal PayPal sandbox account. This reserves test
                    funds; it does not capture payment.
                  </p>
                  <p className="fine-print">
                    {a.paymentRouting === "seller"
                      ? `Recipient: ${a.sellerUser?.name} · PayPal ${m.payeeMerchantId || a.sellerUser?.paypalConnection?.merchantId}`
                      : "Legacy demo agreement: payments go to the configured test merchant, not the invited seller’s account."}
                  </p>
                  <PayPalButton
                    key={m.id}
                    milestoneId={m.id}
                    clientId={paypalClientId}
                    merchantId={
                      a.paymentRouting === "seller"
                        ? m.payeeMerchantId ||
                          a.sellerUser?.paypalConnection?.merchantId ||
                          undefined
                        : undefined
                    }
                    partnerCode={paypalPartnerCode}
                    onSuccess={() => router.refresh()}
                  />
                </>
              ) : (
                <Notice>
                  PayPal sandbox credentials are missing. Configure the
                  integration to authorize this milestone.
                </Notice>
              ))}
            {nextStep === "revise" && browserFixture ? (
              <Button asChild>
                <a href="#browser-evidence">
                  Recheck the corrected sample <ArrowRight size={16} />
                </a>
              </Button>
            ) : (
              ["submit", "revise"].includes(nextStep) && (
                <Button asChild>
                  <Link
                    href={
                      accounts
                        ? "#seller-access"
                        : `/seller/${a.sellerToken}?milestone=${m.id}`
                    }
                  >
                    {accounts
                      ? "Manage seller invitation"
                      : "Switch to seller · submit work"}{" "}
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              )
            )}
            {nextStep === "receipt" && (
              <Button asChild>
                <Link href="/ledger">
                  View payment receipt <ArrowRight size={16} />
                </Link>
              </Button>
            )}
            {["review", "pending", "dispute"].includes(nextStep) && (
              <Button asChild>
                <a
                  href={
                    nextStep === "review"
                      ? m.browserPolicyJson
                        ? "#browser-evidence"
                        : "#payment-decision"
                      : "#payment-decision"
                  }
                >
                  {nextStep === "review"
                    ? "Inspect evidence"
                    : nextStep === "pending"
                      ? "Check payment status"
                      : "Review dispute"}{" "}
                  <ArrowRight size={16} />
                </a>
              </Button>
            )}
          </div>
        </section>
      )}
      {tab === "Milestones" && m.browserPolicyJson && (
        <AgentPanel
          key={m.id}
          milestone={m}
          practice={practice}
          busy={busy}
          run={run}
        />
      )}
      {tab === "Milestones" ? (
        <div className="detail-grid">
          <div>
            <div className="section-heading">
              <h3>Milestone workspace</h3>
              <span className="muted">{a.milestones.length} steps to done</span>
            </div>
            <div className="milestone-list">
              {a.milestones.map((item, i) => (
                <button
                  key={item.id}
                  className={`milestone-selector ${item.id === m.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelected(item.id);
                    setAction(null);
                    setError("");
                    setSuccess("");
                  }}
                >
                  <span
                    className={`milestone-number ${item.status === "RELEASED" ? "complete" : ""}`}
                  >
                    {item.status === "RELEASED" ? (
                      <Check size={18} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      <Status value={item.status} />
                      <small>
                        {item.dueDate
                          ? `Due ${date(item.dueDate)}`
                          : "No due date"}
                      </small>
                    </span>
                  </div>
                  <div className="milestone-price">
                    <strong>{money(item.amount)}</strong>
                    <small>
                      {item.paymentStatus === "UNFUNDED"
                        ? "Not authorized"
                        : item.paymentStatus === "AUTHORIZED"
                          ? "Authorized"
                          : item.paymentStatus === "CAPTURED"
                            ? "Captured"
                            : "Pending capture"}
                    </small>
                  </div>
                  <ChevronDown
                    size={15}
                    className={item.id === m.id ? "" : "rotated"}
                  />
                </button>
              ))}
            </div>
            <section className="card milestone-body">
              <div className="card-heading">
                <h3>{m.title}</h3>
                <span className="subtle-pill">Milestone {m.position + 1}</span>
              </div>
              <p className="muted">{m.description}</p>
              <h4>Acceptance criteria</h4>
              <div className="criteria-list">
                {criteria.map((c, i) => (
                  <div key={i}>
                    <span>{i + 1}</span>
                    <p>{c}</p>
                  </div>
                ))}
              </div>
              <div className="payment-strip">
                <LockKeyhole size={18} />
                <div>
                  <strong>{money(m.amount)} milestone payment</strong>
                  <small>
                    {m.paymentStatus === "UNFUNDED"
                      ? "Authorize before approving the payment."
                      : m.paymentStatus === "CAPTURED"
                        ? "Payment captured following your approval."
                        : `Authorization ${m.expiresAt ? `expires ${date(m.expiresAt)}` : "recorded"}. Capture remains subject to PayPal approval.`}
                  </small>
                </div>
                <Status value={m.paymentStatus} />
              </div>
              {m.authorizedAt && m.paymentStatus === "AUTHORIZED" && (
                <p className="fine-print">
                  PayPal authorizations last up to 29 days; capture success is
                  highest within the first 3 days. Authorize close to delivery.
                </p>
              )}
            </section>
            <section className="card submission-card">
              <div className="card-heading">
                <h3>
                  <FileText size={17} />
                  Seller submission
                </h3>
                {sub && <small>{date(sub.createdAt)}</small>}
              </div>
              {sub ? (
                <>
                  {html ? (
                    <div className="artifact-source">
                      <div className="artifact-heading">
                        <strong>
                          Submitted HTML · version {m.submissions.length}
                        </strong>
                        <span>Source only · not executed</span>
                      </div>
                      <pre>{html}</pre>
                    </div>
                  ) : (
                    <p className="submission-content">
                      {sub.content.replace(/^AGENT_FIXTURE_V[12]:\s*/, "")}
                    </p>
                  )}
                  {sub.url &&
                    !m.browserPolicyJson?.includes('"fixture":true') && (
                      <a
                        className="evidence-link"
                        href={sub.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Link2 size={15} />
                        <span>{sub.url}</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  <p className="fine-print">
                    {m.browserPolicyJson
                      ? "The browser checks only the buyer-approved URL. Inspect the findings and screenshots above."
                      : "Links are supplied by the seller. Text reviews do not browse or verify their contents."}
                  </p>
                  {m.submissions.length > 1 && (
                    <details>
                      <summary>
                        {m.submissions.length - 1} previous submission(s)
                      </summary>
                      {m.submissions.slice(1).map((s) => (
                        <div key={s.id} className="previous-submission">
                          <small>
                            {date(s.createdAt)} · {s.aiSource} review
                          </small>
                          <p>{s.content}</p>
                        </div>
                      ))}
                    </details>
                  )}
                </>
              ) : (
                <div className="empty">
                  <FileText size={28} />
                  <h3>Ready for the first submission</h3>
                  <p>
                    {judgeDemo
                      ? "Try the seller view to submit work and supporting evidence."
                      : "Share the seller link to collect work and supporting evidence."}
                  </p>
                  <Button variant="outline" asChild>
                    <Link href={`/seller/${a.sellerToken}?milestone=${m.id}`}>
                      Open seller view <ArrowUpRight size={15} />
                    </Link>
                  </Button>
                </div>
              )}
            </section>
          </div>
          <aside>
            <section className="card ai-panel" id="payment-decision">
              <div className="ai-panel-header">
                <span className="ai-mark">
                  <Sparkles size={20} />
                </span>
                <div>
                  <h3>
                    {m.browserPolicyJson
                      ? "Payment decision"
                      : "Evidence review"}
                  </h3>
                  <small>Clear reasoning. Your decision.</small>
                </div>
              </div>
              {review && sub ? (
                <>
                  {websiteDemo && (
                    <div className="walkthrough-note">
                      <strong>Website walkthrough</strong>
                      <p>
                        {m.status === "RELEASED"
                          ? "The buyer approved the work. Your practice receipt is below."
                          : m.status === "REVISION_REQUESTED"
                            ? "Next: act as the seller and submit the corrected HTML."
                            : missingEvidence
                              ? "The source is missing a delivery note. Request a revision to continue."
                              : "The corrected source meets all three source requirements. Inspect it, then approve the practice payment."}
                      </p>
                    </div>
                  )}
                  {!m.browserPolicyJson && (
                    <>
                      <div className={`source-label source-${sub.aiSource}`}>
                        {sub.aiSource.startsWith("agent-")
                          ? sub.aiSource === "agent-live"
                            ? "LIVE AI BROWSER AGENT"
                            : sub.aiSource === "agent-pending"
                              ? "BROWSER VERIFICATION PENDING"
                              : "BROWSER REHEARSAL · NO LIVE AI"
                          : sub.aiSource === "live+checks"
                            ? "LIVE AI + HTML SOURCE CHECKS"
                            : sub.aiSource === "checks"
                              ? "HTML SOURCE CHECKS · NO AI MODEL"
                              : sub.aiSource === "live"
                                ? "LIVE AI REVIEW"
                                : sub.aiSource === "demo"
                                  ? "DEMO FIXTURE · PREWRITTEN REVIEW"
                                  : "FALLBACK · MODEL NOT USED"}
                      </div>
                      <div className="score-row">
                        <div
                          className="score-ring"
                          style={
                            {
                              "--score": `${sub.aiScore}%`,
                            } as React.CSSProperties
                          }
                        >
                          <span>
                            {passedCount}
                            <small>/ {criteria.length}</small>
                          </span>
                        </div>
                        <div>
                          <small>CRITERIA SUPPORTED</small>
                          <h3>
                            {m.status === "RELEASED"
                              ? sub.aiSource === "fallback"
                                ? "Manually approved · AI review unavailable"
                                : "Evidence accepted"
                              : sub.aiSource === "fallback"
                                ? "Manual review required"
                                : sub.aiRecommendation === "release"
                                  ? "Ready for your approval"
                                  : sub.aiRecommendation === "revise"
                                    ? "A requirement is missing"
                                    : "Needs investigation"}
                          </h3>
                          <span>
                            {review.checklist.filter((c) => c.passed).length} of{" "}
                            {criteria.length} criteria supported
                          </span>
                        </div>
                      </div>
                      <p className="review-explanation">{review.explanation}</p>
                      <h4>Criterion-by-criterion</h4>
                      <div className="evidence-checklist">
                        {review.checklist.map((c) => (
                          <div key={c.criterionIndex}>
                            <span
                              className={c.passed ? "check-pass" : "check-fail"}
                            >
                              {c.passed ? (
                                <CheckCircle2 size={17} />
                              ) : (
                                <Circle size={17} />
                              )}
                            </span>
                            <div>
                              <strong>{criteria[c.criterionIndex]}</strong>
                              <p>{c.evidence}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {review.riskFlags.length > 0 && (
                        <details className="risk-box">
                          <summary>
                            Verification scope and artifact fingerprint
                          </summary>
                          {review.riskFlags.map((r, i) => (
                            <p key={i}>{r}</p>
                          ))}
                        </details>
                      )}
                    </>
                  )}
                  <div className="decision-zone">
                    <p>
                      <ShieldCheck size={15} /> You have the final say
                    </p>
                    {m.status === "RELEASED" ? (
                      <div className="released-state">
                        <CheckCheck size={24} />
                        <strong>Approved and released</strong>
                        <span>
                          {money(m.amount)}{" "}
                          {practice ? "practice capture" : "sandbox capture"}{" "}
                          recorded.
                        </span>
                        {receipt && (
                          <div className="receipt-reference">
                            <small>
                              {practice
                                ? "Simulated receipt"
                                : "PayPal sandbox receipt"}
                            </small>
                            <code>{receipt.providerCaptureId}</code>
                            <Link className="text-link" href="/ledger">
                              View payment record <ArrowRight size={14} />
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : m.status === "DISPUTED" ? (
                      <>
                        <Notice>
                          Internal dispute open. Payment release is blocked.
                          This does not file a PayPal dispute.
                        </Notice>
                        <Button
                          variant="outline"
                          disabled={!!busy}
                          onClick={() => choose("reopen")}
                        >
                          Resolve & request revision
                        </Button>
                      </>
                    ) : m.status === "REVISION_REQUESTED" ? (
                      <>
                        <Notice>
                          A revision has been requested. The original submission
                          stays in the record.
                        </Notice>
                        {websiteDemo ? (
                          <Button
                            className="full-width"
                            disabled={!!busy}
                            onClick={() =>
                              run(
                                `milestones/${m.id}/demo-revision`,
                                {},
                                "Checking corrected source…",
                              )
                            }
                          >
                            {busy || "Submit corrected sample"}
                            <ArrowRight size={15} />
                          </Button>
                        ) : (
                          <Button asChild variant="outline">
                            <Link
                              href={`/seller/${a.sellerToken}?milestone=${m.id}`}
                            >
                              Open seller view
                            </Link>
                          </Button>
                        )}
                      </>
                    ) : m.paymentStatus === "CAPTURE_PENDING" ? (
                      <Button
                        disabled={!!busy}
                        onClick={() =>
                          run(
                            "paypal/capture-order",
                            {
                              milestoneId: m.id,
                              reason:
                                "Buyer checked the pending capture status.",
                            },
                            "Checking…",
                          )
                        }
                      >
                        Check PayPal capture status
                      </Button>
                    ) : (
                      <>
                        {missingEvidence && (
                          <Button
                            className="full-width"
                            disabled={!!busy}
                            onClick={() => {
                              choose("revise");
                              setReason(
                                websiteDemo
                                  ? "Please add the missing delivery note: Ships in 2 business days."
                                  : "Please address the unsupported criteria and provide updated evidence.",
                              );
                            }}
                          >
                            <RotateCcw size={15} />
                            Request revision
                          </Button>
                        )}
                        <Button
                          className="full-width"
                          variant={missingEvidence ? "outline" : "default"}
                          disabled={!!busy || m.paymentStatus !== "AUTHORIZED"}
                          onClick={() => choose("release")}
                        >
                          <Check size={16} />
                          {missingEvidence
                            ? "Approve despite missing evidence"
                            : `Approve & ${practice ? "simulate payment" : "capture"} ${money(m.amount)}`}
                        </Button>
                        {m.paymentStatus !== "AUTHORIZED" && (
                          <small className="fine-print">
                            Authorize the milestone to enable release.
                          </small>
                        )}
                        <div className="button-row">
                          {!missingEvidence && (
                            <Button
                              variant="outline"
                              disabled={!!busy}
                              onClick={() => choose("revise")}
                            >
                              <RotateCcw size={14} />
                              Request revision
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            disabled={!!busy}
                            onClick={() => choose("dispute")}
                          >
                            <Flag size={14} />
                            Dispute
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  {!m.browserPolicyJson &&
                    !["RELEASED", "DISPUTED"].includes(m.status) &&
                    m.paymentStatus !== "CAPTURE_PENDING" && (
                      <button
                        className="text-link rerun"
                        disabled={!!busy}
                        onClick={() =>
                          run(
                            `milestones/${m.id}/review`,
                            {},
                            "Reviewing evidence…",
                          )
                        }
                      >
                        {busy ? (
                          <LoaderCircle className="spin" size={14} />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        Rerun evidence review
                      </button>
                    )}
                </>
              ) : (
                <div className="empty">
                  <Sparkles size={28} />
                  <h3>Evidence comes first</h3>
                  <p>
                    When work is submitted, the AI checks it against the agreed
                    criteria. You decide what happens next.
                  </p>
                </div>
              )}
            </section>
            {!accounts && (
              <section className="card share-card">
                <MessageSquare size={20} />
                <h3>
                  {judgeDemo
                    ? "Next: try the seller’s side"
                    : "Seller submission link"}
                </h3>
                <p>
                  {judgeDemo
                    ? "Open the seller view to submit work, then return here to review it. This link works only in your current demo session."
                    : accounts
                      ? "Choose your seller's account above. They accept the invitation once, then can submit work."
                      : "Anyone with this private link can see the submission view and submit work. Share it directly with your seller."}
                </p>
                <div className="button-row">
                  {!judgeDemo && (
                    <CopyButton value={`/seller/${a.sellerToken}`} />
                  )}
                  <Link
                    className="text-link"
                    href={`/seller/${a.sellerToken}?milestone=${m.id}`}
                  >
                    Open seller view <ArrowUpRight size={14} />
                  </Link>
                </div>
              </section>
            )}
          </aside>
        </div>
      ) : tab === "Activity" ? (
        <section className="card activity-card">
          <div className="card-heading">
            <h3>The complete record</h3>
            <Clock3 size={18} />
          </div>
          {a.timeline.map((t) => (
            <div key={t.id} className="activity-row">
              <span className="activity-icon">
                <Check size={15} />
              </span>
              <div>
                <p>{t.message}</p>
                <small>
                  {t.actor} · {timestamp(t.createdAt)}
                </small>
              </div>
            </div>
          ))}
          <h4>Payment events</h4>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ACTION</th>
                  <th>PROVIDER</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>PROVIDER REFERENCE</th>
                </tr>
              </thead>
              <tbody>
                {a.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.type}</td>
                    <td>{p.provider}</td>
                    <td>{money(p.amount)}</td>
                    <td>{p.status}</td>
                    <td className="mono">
                      {p.providerCaptureId ||
                        p.providerAuthorizationId ||
                        p.providerOrderId ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card form-card">
          <h3>Project brief</h3>
          <p className="submission-content">{a.description}</p>
          <div className="field-grid">
            <p>
              <strong>Seller</strong>
              <br />
              Seller: {a.sellerEmail}
            </p>
            <p>
              <strong>Deadline</strong>
              <br />
              {a.deadline ? date(a.deadline) : "Not specified"}
            </p>
          </div>
          <div className="risk-box">
            <strong>Scope and risk notes</strong>
            {(JSON.parse(a.riskFlags) as string[]).map((r, i) => (
              <p key={i}>{r}</p>
            ))}
          </div>
          <Notice>
            The saved scope is fixed for this MVP. Agree changes with the seller
            and create a new agreement for a different scope. Sandbox payments
            settle to the configured merchant, not automatically to the seller
            email.
          </Notice>
        </section>
      )}
      {action && (
        <div
          className="modal-backdrop"
          onClick={() => !busy && setAction(null)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-heading">
              <h2 id="decision-title">
                {action === "release"
                  ? `Approve ${money(m.amount)} release?`
                  : action === "revise"
                    ? "Request a revision"
                    : action === "dispute"
                      ? "Open an internal dispute"
                      : "Resolve this dispute"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close decision"
                disabled={!!busy}
                onClick={() => setAction(null)}
              >
                <X size={18} />
              </Button>
            </div>
            <p className="muted">
              {action === "release"
                ? `${practice ? "This records a simulated capture. No money moves." : "This captures the sandbox authorization into the configured merchant account."} Review the evidence before approving.`
                : action === "dispute"
                  ? "This blocks release inside Paylock. It does not contact PayPal or start a provider dispute."
                  : "Your note will be visible to the seller in the agreement timeline."}
            </p>
            {action === "release" && missingEvidence && (
              <Notice error>
                {criteria.length - passedCount} criteria are unsupported.
                Approval overrides this finding; explain what you independently
                verified.
              </Notice>
            )}
            <div className="field">
              <label htmlFor="decision-note">
                Decision note · at least 10 characters
              </label>
              <textarea
                id="decision-note"
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explain what you verified or what needs to change…"
                maxLength={1000}
              />
            </div>
            {action === "release" && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I reviewed the evidence and authorize this{" "}
                {practice ? "practice" : "sandbox"} capture.
              </label>
            )}
            {error && <Notice error>{error}</Notice>}
            <Button
              className="full-width"
              disabled={
                !!busy ||
                reason.trim().length < 10 ||
                (action === "release" && !confirmed)
              }
              onClick={() =>
                run(
                  action === "release"
                    ? "paypal/capture-order"
                    : `milestones/${m.id}/decision`,
                  { milestoneId: m.id, action, reason },
                  "Saving decision…",
                )
              }
            >
              {busy ||
                (action === "release" ? "Confirm release" : "Save decision")}
              <ArrowRight size={15} />
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
