"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanEye } from "lucide-react";
import { Button } from "./ui/button";
import { api, Notice } from "./common";

export function AgentStudio({
  demoWebsiteUrl = "",
  accounts = false,
}: {
  demoWebsiteUrl?: string;
  accounts?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [useExample, setUseExample] = useState(false);
  const [sellerAccountId, setSellerAccountId] = useState("");
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
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
            Offline sample with simulated payments. The run identifies whether
            live AI or the deterministic fallback selected its checks.
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
      <details
        className="card form-card agent-create"
        id="sandbox-website"
        open={!!demoWebsiteUrl}
      >
        <summary>PayPal sandbox verification · deployed website</summary>
        <p className="muted">
          Define the exact requirements before the seller submits. Read-only
          HTTPS pages are supported with JavaScript disabled. Purchase links
          must stay on the same origin. A $100 manual handoff milestone is added
          to the verification amount.
        </p>
        {demoWebsiteUrl && (
          <>
            <p>
              This path uses an actual PayPal sandbox authorization and capture.
              Use our public test storefront to try it; no real money moves.
            </p>
            <ol>
              <li>Review the requirements below and create the agreement.</li>
              <li>
                {accounts
                  ? "Invite the seller’s Paylock account and wait for them to accept and connect their Business PayPal sandbox account, then authorize the $5 verification milestone with a Personal PayPal sandbox account."
                  : "Authorize the $5 verification milestone with a Personal PayPal sandbox account."}
              </li>
              <li>
                {accounts
                  ? "Optionally enable the exact-amount payment permission, then have the seller submit the website from their seller workspace."
                  : "Optionally enable the exact-amount payment permission, then open seller view and submit the website."}
              </li>
              <li>
                Live AI inspects the site. Passing checks allow capture under
                your permission; otherwise you review the result.
              </li>
            </ol>
            <div className="button-row">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setUseExample(true)}
              >
                Fill with test storefront requirements
              </Button>
              <a
                href={demoWebsiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                View test storefront ↗
              </a>
            </div>
            <p className="muted">
              The storefront is a demo deliverable. Its purchase link leads to a
              preview; PayPal pays for the verification milestone in Paylock.
            </p>
          </>
        )}
        <form
          key={useExample ? "example" : "custom"}
          onSubmit={(e) => {
            e.preventDefault();
            if (accounts && sellerAccountId.trim() && !identityConfirmed) {
              setError(
                "Confirm that you received this account ID directly from your seller.",
              );
              return;
            }
            const data = Object.fromEntries(new FormData(e.currentTarget));
            void create("agent/jobs", {
              ...data,
              ...(accounts && sellerAccountId.trim()
                ? { sellerAccountId: sellerAccountId.trim() }
                : {}),
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
                  defaultValue={
                    useExample
                      ? name === "targetUrl"
                        ? demoWebsiteUrl
                        : name === "sellerEmail"
                          ? "seller@example.com"
                          : placeholder
                      : undefined
                  }
                  required
                  maxLength={name === "targetUrl" ? 1000 : 120}
                />
              </div>
            ))}
          </div>
          <p className="muted">
            {accounts
              ? "You confirm these requirements as the buyer. Use the email your seller signs in to Paylock with; no email is sent automatically."
              : "You confirm these requirements as the buyer. Seller email is contact information; no invitation is sent."}
          </p>
          {accounts && (
            <div className="field">
              <label htmlFor="seller-account">
                Seller’s Paylock account ID <span>optional</span>
              </label>
              <input
                id="seller-account"
                value={sellerAccountId}
                maxLength={128}
                onChange={(e) => {
                  setSellerAccountId(e.target.value);
                  setIdentityConfirmed(false);
                }}
              />
              <small>
                Ask your seller to copy this from Account. They accept your
                invitation once; leave blank to choose the recipient after
                saving.
              </small>
              {sellerAccountId.trim() && (
                <label className="invitation-confirmation">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(e) => setIdentityConfirmed(e.target.checked)}
                  />{" "}
                  I received this account ID directly from my seller.
                </label>
              )}
            </div>
          )}
          <div className="field">
            <label htmlFor="amount">Verification milestone · USD</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              max="10000"
              step="0.01"
              defaultValue={useExample ? "5" : "300"}
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
