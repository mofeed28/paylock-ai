"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  type Plan,
  type Brief,
  briefSchema,
  agreementSchema,
} from "@/lib/schema";
import { money } from "@/lib/utils";
import { Button } from "./ui/button";
import { api, Notice, Status } from "./common";
export function AgreementForm({
  mode,
  judgeDemo = false,
}: {
  mode: string;
  judgeDemo?: boolean;
}) {
  const router = useRouter();
  const [brief, setBrief] = useState({
    title: "",
    sellerEmail: "",
    budget: "900",
    description: "",
    deadline: "",
  });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [source, setSource] = useState<"live" | "fallback" | "demo">(
    "fallback",
  );
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  function input(): Brief {
    return briefSchema.parse({
      ...brief,
      totalAmount: Math.round(Number(brief.budget) * 100),
      deadline: brief.deadline || null,
    });
  }
  function patch(index: number, key: string, value: unknown) {
    setPlan((p) =>
      p
        ? {
            ...p,
            milestones: p.milestones.map((m, i) =>
              i === index ? { ...m, [key]: value } : m,
            ),
          }
        : p,
    );
  }
  const total = plan?.milestones.reduce((a, m) => a + m.amount, 0) || 0;
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy("Generating milestones…");
    setError("");
    try {
      const data = await api<{
        plan: Plan;
        source: typeof source;
        notice: string | null;
      }>("ai/generate", input());
      setPlan(data.plan);
      setSource(data.source);
      setNotice(data.notice || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function save() {
    setBusy("Creating agreement…");
    setError("");
    try {
      const body = agreementSchema.parse({
        ...input(),
        plan,
        aiSource: source,
      });
      const a = await api<{ id: string }>("agreements", body);
      router.push(`/agreements/${a.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }
  return (
    <div className="page narrow">
      <Link className="back-link" href="/agreements">
        <ArrowLeft size={15} />
        Your agreements
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUYER · SET THE REQUIREMENTS</div>
          <h1>New agreement</h1>
          <p>
            You define the work and budget. AI drafts milestones for you to
            review.
          </p>
        </div>
        <Status value={mode} />
      </div>
      <div className="stepper">
        <span className="current">
          <i>{plan ? <Check size={13} /> : "1"}</i>Project brief
        </span>
        <div />
        <span className={plan ? "current" : ""}>
          <i>2</i>Review milestones
        </span>
        <div />
        <span>
          <i>3</i>Save your agreement
        </span>
      </div>
      {error && <Notice error>{error}</Notice>}
      {!plan ? (
        <form onSubmit={generate} className="form-layout">
          <section className="card form-card">
            <h3>What are you hiring the seller to do?</h3>
            <div className="field">
              <label htmlFor="title">Project title</label>
              <input
                id="title"
                value={brief.title}
                onChange={(e) => setBrief({ ...brief, title: e.target.value })}
                placeholder="e.g. Shopify product page optimization"
                required
                minLength={3}
                maxLength={150}
              />
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="email">Seller contact email</label>
                <input
                  id="email"
                  type="email"
                  value={brief.sellerEmail}
                  onChange={(e) =>
                    setBrief({ ...brief, sellerEmail: e.target.value })
                  }
                  placeholder="seller@studio.com"
                  required
                />
                <small>Contact information only. No invitation is sent.</small>
              </div>
              <div className="field">
                <label htmlFor="budget">Total budget · USD</label>
                <input
                  id="budget"
                  type="number"
                  min="5"
                  max="100000"
                  step="0.01"
                  value={brief.budget}
                  onChange={(e) =>
                    setBrief({ ...brief, budget: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="description">Your requirements</label>
              <textarea
                id="description"
                rows={6}
                value={brief.description}
                onChange={(e) =>
                  setBrief({ ...brief, description: e.target.value })
                }
                placeholder="Describe the outcome, deliverables, constraints, and what you'll need to see before approving the work."
                minLength={30}
                maxLength={12000}
                required
              />
              <small>
                Be specific. AI uses this to propose measurable acceptance
                criteria.
              </small>
            </div>
            <div className="field">
              <label htmlFor="deadline">
                Project deadline <span>optional</span>
              </label>
              <input
                id="deadline"
                type="date"
                value={brief.deadline}
                onChange={(e) =>
                  setBrief({ ...brief, deadline: e.target.value })
                }
              />
            </div>
            <Button disabled={!!busy} type="submit">
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Sparkles size={16} />
              )}{" "}
              {busy || "Draft milestones with AI"}
              <ArrowRight size={16} />
            </Button>
          </section>
          <aside className="form-aside">
            <div className="stat-icon mint">
              <Sparkles size={22} />
            </div>
            <h3>You own the requirements.</h3>
            <p>
              AI proposes the milestones and delivery checks. You edit and
              confirm them before saving.
            </p>
            <ul>
              <li>
                <strong>Buyer:</strong> defines requirements and payment
                permission.
              </li>
              <li>
                <strong>Seller:</strong> submits work against those
                requirements.
              </li>
              <li>
                <strong>AI:</strong> reviews evidence to support your decision.
              </li>
            </ul>
            <p>
              {judgeDemo
                ? "Your agreement stays private to this demo session. You can test the seller view after saving. Other judges cannot see it."
                : "Saving does not publish the agreement or email the seller. You can share a private submission link afterward."}
            </p>
            <button
              className="text-link"
              type="button"
              onClick={() =>
                setBrief({
                  title: "Wireless power bank · Shopify optimization",
                  sellerEmail: "jamie@studio.example",
                  budget: "900",
                  description:
                    "Build a Shopify product page optimization audit and implement improvements for a wireless power bank product. Include competitor comparisons, prioritized copy and layout changes, implementation evidence, and mobile QA.",
                  deadline: "",
                })
              }
            >
              Fill with example requirements <ArrowRight size={14} />
            </button>
          </aside>
        </form>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <h2>Review your requirements before saving</h2>
              <p className="muted">
                These are AI suggestions. You decide the final deliverables,
                payment split, and acceptance criteria.
              </p>
            </div>
            <span className="subtle-pill">
              {source === "live" ? "AI-generated draft" : "Template draft"}
            </span>
          </div>
          {notice && <Notice>{notice}</Notice>}
          <div className="risk-box">
            <strong>Points to clarify</strong>
            {plan.riskFlags.map((r, i) => (
              <p key={i}>• {r}</p>
            ))}
          </div>
          {plan.milestones.map((m, i) => (
            <section className="card form-card milestone-editor" key={i}>
              <div className="card-heading">
                <h3>
                  <span className="index-label">0{i + 1}</span>Milestone {i + 1}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={plan.milestones.length <= 2}
                  aria-label={`Remove milestone ${i + 1}`}
                  onClick={() =>
                    setPlan({
                      ...plan,
                      milestones: plan.milestones.filter((_, j) => i !== j),
                    })
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor={`title-${i}`}>Title</label>
                  <input
                    id={`title-${i}`}
                    value={m.title}
                    onChange={(e) => patch(i, "title", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`amount-${i}`}>Payment · USD</label>
                  <input
                    id={`amount-${i}`}
                    type="number"
                    min="1"
                    step="0.01"
                    value={m.amount / 100}
                    onChange={(e) =>
                      patch(
                        i,
                        "amount",
                        Math.round(Number(e.target.value) * 100),
                      )
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor={`desc-${i}`}>Deliverable</label>
                <textarea
                  id={`desc-${i}`}
                  rows={2}
                  value={m.description}
                  onChange={(e) => patch(i, "description", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor={`criteria-${i}`}>
                  Acceptance criteria <span>one per line · 2–8 required</span>
                </label>
                <textarea
                  id={`criteria-${i}`}
                  rows={4}
                  value={m.acceptanceCriteria.join("\n")}
                  onChange={(e) =>
                    patch(i, "acceptanceCriteria", e.target.value.split("\n"))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={`due-${i}`}>Due date</label>
                <input
                  id={`due-${i}`}
                  type="date"
                  value={m.dueDate || ""}
                  onChange={(e) => patch(i, "dueDate", e.target.value || null)}
                />
              </div>
              <small>{m.aiRiskNotes}</small>
            </section>
          ))}
          {plan.milestones.length < 5 && (
            <Button
              variant="outline"
              onClick={() =>
                setPlan({
                  ...plan,
                  milestones: [
                    ...plan.milestones,
                    {
                      title: "New milestone",
                      description:
                        "Describe the deliverable for this milestone.",
                      amount: 100,
                      acceptanceCriteria: [
                        "Define a measurable acceptance criterion.",
                        "Specify the evidence required for approval.",
                      ],
                      dueDate: brief.deadline || null,
                      aiRiskNotes: "Confirm the new scope with the seller.",
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add milestone
            </Button>
          )}
          <div className="save-bar">
            <div>
              <strong>
                {money(total)}{" "}
                <span className="muted">
                  of {money(Number(brief.budget) * 100)}
                </span>
              </strong>
              <small
                className={
                  total !== Number(brief.budget) * 100 ? "error-text" : ""
                }
              >
                {total === Number(brief.budget) * 100
                  ? "Payment split balances. Ready when you are."
                  : "Adjust the split to match your budget."}
              </small>
            </div>
            <div className="button-row">
              <Button
                variant="outline"
                disabled={!!busy}
                onClick={() => setPlan(null)}
              >
                Back to brief
              </Button>
              <Button
                disabled={
                  !!busy || total !== Math.round(Number(brief.budget) * 100)
                }
                onClick={save}
              >
                {busy || "Confirm requirements & create"}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
