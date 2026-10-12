"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanEye } from "lucide-react";
import { Button } from "./ui/button";
import { api, Notice } from "./common";

export function AgentStudio() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create(path: string, values: unknown) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: string }>(path, values);
      router.push(`/agreements/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="page focused-workspace">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PAYLOCK VERIFICATION AGENT</div>
          <h1>Work checked. Payment earned.</h1>
          <p>
            A browser agent inspects the delivery, requests fixes, and acts
            within your payment permission.
          </p>
        </div>
      </div>
      {error && <Notice error>{error}</Notice>}
      <section className="focus-card">
        <div className="focus-copy">
          <span className="focus-kicker">
            <ScanEye size={17} /> NORTHSTAR · $300 WEBSITE MILESTONE
          </span>
          <h2>
            A good-looking page.
            <br />A broken purchase link.
          </h2>
          <p>
            The agent opens the page, follows the link, and catches the failure.
            Submit the corrected version to see it recheck the work and apply
            your saved payment policy.
          </p>
          <Button disabled={busy} onClick={() => create("agent/demo", {})}>
            {busy ? "Opening…" : "Try the browser agent"}
            <ArrowRight size={16} />
          </Button>
          <small>
            Real browser checks on an offline sample. Payments are simulated. AI
            planning requires a model key.
          </small>
        </div>
        <ol className="journey-list">
          {[
            ["Inspect", "Rendered pages, link destination, mobile layout."],
            [
              "Request a fix",
              "Concrete browser findings become revision feedback.",
            ],
            ["Recheck", "New work triggers another verification run."],
            [
              "Apply your policy",
              "Capture only when every check and permission passes.",
            ],
          ].map(([title, description], i) => (
            <li key={title}>
              <span>{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <details className="card form-card agent-create">
        <summary>Verify a deployed website</summary>
        <p className="muted">
          Define the exact requirements before the seller submits. Read-only
          HTTPS pages are supported with JavaScript disabled. Purchase links
          must stay on the same origin. A $100 manual handoff milestone is added
          to the verification amount.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            void create("agent/jobs", {
              ...data,
              amount: Math.round(Number(data.amount) * 100),
            });
          }}
        >
          <div className="field-grid">
            {[
              [
                "targetUrl",
                "Approved product URL",
                "url",
                "https://example.com/product",
              ],
              ["sellerEmail", "Seller email", "email", "seller@example.com"],
              [
                "heading",
                "Exact product heading",
                "text",
                "Northstar Power Bank",
              ],
              [
                "deliveryText",
                "Visible delivery text",
                "text",
                "Ships in 2 business days",
              ],
              ["linkText", "Purchase link label", "text", "Buy now"],
              [
                "destinationHeading",
                "Exact destination heading",
                "text",
                "Checkout preview",
              ],
            ].map(([name, label, type, placeholder]) => (
              <div className="field" key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  placeholder={placeholder}
                  required
                  maxLength={name === "targetUrl" ? 1000 : 120}
                />
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="amount">Verification milestone · USD</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              max="10000"
              step="0.01"
              defaultValue="300"
              required
            />
          </div>
          <Button disabled={busy} type="submit">
            Create verification agreement
            <ArrowRight size={16} />
          </Button>
        </form>
      </details>
      <details className="demo-restart">
        <summary>Restart the sample</summary>
        <p>Your existing evidence and payment records are kept.</p>
        <Button
          disabled={busy}
          variant="outline"
          onClick={() => create("agent/demo", { fresh: true })}
        >
          Create a fresh agent demo
        </Button>
      </details>
    </div>
  );
}
