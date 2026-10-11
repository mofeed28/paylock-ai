"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileUp,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { AgreementView } from "@/lib/data";
import { money } from "@/lib/utils";
import { Button } from "./ui/button";
import { api, Notice, Status } from "./common";
type SellerAgreement = Pick<
  AgreementView,
  | "id"
  | "title"
  | "description"
  | "sellerEmail"
  | "sellerToken"
  | "paymentMode"
  | "milestones"
> & { timeline: { id: string; message: string; createdAt: string }[] };
export function SellerPortal({ agreement: a }: { agreement: SellerAgreement }) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    a.milestones.find((m) =>
      ["PENDING", "REVISION_REQUESTED"].includes(m.status),
    )?.id || a.milestones[0].id,
  );
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const m = a.milestones.find((m) => m.id === selected)!;
  const blocked =
    !["PENDING", "REVISION_REQUESTED"].includes(m.status) ||
    m.paymentStatus === "CAPTURE_PENDING";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(`seller/${a.sellerToken}/submit`, {
        milestoneId: m.id,
        content,
        url,
      });
      setSuccess(
        "Work submitted and review recorded. The buyer can now approve, request revisions, or open a dispute.",
      );
      setContent("");
      setUrl("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SELLER PORTAL</div>
          <h1>Let your work speak.</h1>
          <p>{a.title}</p>
        </div>
        <Status value={a.paymentMode} />
      </div>
      <Notice>
        This private link allows submissions for {a.sellerEmail}. Keep it
        private. Payment approval remains with the buyer.
      </Notice>
      <div className="form-layout">
        <form className="card form-card" onSubmit={submit}>
          <div className="card-heading">
            <h3>
              <FileUp size={19} />
              Submit milestone evidence
            </h3>
            <ShieldCheck size={18} />
          </div>
          <div className="field">
            <label htmlFor="milestone">Milestone</label>
            <select
              id="milestone"
              value={selected}
              disabled={busy}
              onChange={(e) => {
                setSelected(e.target.value);
                setContent("");
                setUrl("");
                setSuccess("");
                setError("");
              }}
            >
              {a.milestones.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.position + 1}. {x.title} · {money(x.amount)}
                </option>
              ))}
            </select>
          </div>
          <Status value={m.status} />
          <h4>What the buyer expects</h4>
          <div className="criteria-list">
            {(JSON.parse(m.acceptanceCriteria) as string[]).map((c, i) => (
              <div key={i}>
                <span>{i + 1}</span>
                <p>{c}</p>
              </div>
            ))}
          </div>
          {blocked ? (
            <Notice>
              {m.status === "IN_REVIEW"
                ? "Your submission is awaiting buyer review. A new version can be submitted if the buyer requests a revision."
                : m.status === "RELEASED"
                  ? "This milestone is complete and its payment has been released."
                  : "This milestone is in dispute. Wait for the buyer to resolve it."}
            </Notice>
          ) : (
            <>
              <div className="field">
                <label htmlFor="content">
                  Your work and supporting evidence
                </label>
                <textarea
                  id="content"
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  minLength={20}
                  maxLength={16000}
                  placeholder="Address each criterion. Include concrete excerpts, test results, comparisons, and limitations. A link alone is not sufficient evidence."
                />
              </div>
              <div className="field">
                <label htmlFor="url">
                  Deliverable URL <span>optional</span>
                </label>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                />
                <small>
                  The reviewer only reads your submitted text; it does not open
                  this URL.
                </small>
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Send size={16} />
                )}{" "}
                {busy ? "Submitting & reviewing…" : "Submit for review"}
              </Button>
            </>
          )}
          {error && <Notice error>{error}</Notice>}
          {success && <Notice>{success}</Notice>}
        </form>
        <aside className="form-aside">
          <span className="stat-icon mint">
            <CheckCircle2 size={22} />
          </span>
          <h3>
            Good evidence
            <br />
            moves work forward.
          </h3>
          <p>
            Show how your work meets each agreed criterion. Be clear about what
            is complete and what still needs attention.
          </p>
          <h4>Buyer feedback</h4>
          {a.timeline.length ? (
            a.timeline.map((t) => (
              <p key={t.id} className="seller-feedback">
                {t.message}
              </p>
            ))
          ) : (
            <p>No decisions yet. Buyer feedback will appear here.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
