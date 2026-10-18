"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  ArrowRight,
  ScanEye,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, Notice } from "@/components/common";
export default function Page() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-page login-experience">
      <section className="login-story" aria-label="About Paylock">
        <div className="brand">
          <span className="brand-mark">
            <LockKeyhole size={22} />
          </span>
          paylock<span className="brand-ai">AI</span>
        </div>
        <span className="eyebrow">EVIDENCE BEFORE PAYMENT</span>
        <h1>
          Good work deserves
          <br />
          <em>a clear yes.</em>
        </h1>
        <p className="login-lead">
          Agree on the work. Let AI check the delivery. Use PayPal to pay when
          you’re ready.
        </p>
        <div className="login-proof">
          <span className="eyebrow">HOW A WEBSITE MILESTONE WORKS</span>
          <div>
            <span className="proof-icon">
              <LockKeyhole size={18} />
            </span>
            <p>
              <strong>You set the conditions</strong>
              <small>Requirements and a PayPal sandbox authorization</small>
            </p>
          </div>
          <div>
            <span className="proof-icon">
              <ScanEye size={18} />
            </span>
            <p>
              <strong>The agent checks the delivery</strong>
              <small>
                Browser observations, screenshots, and specific revision
                feedback
              </small>
            </p>
          </div>
          <div>
            <span className="proof-icon">
              <Check size={18} />
            </span>
            <p>
              <strong>Your decision becomes a payment</strong>
              <small>Manual approval or a permission you explicitly set</small>
            </p>
          </div>
        </div>
        <p className="login-powered">
          Amazon Bedrock · PayPal sandbox · Browser evidence
        </p>
      </section>
      <form
        className="card form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("login", { key });
            router.push("/judge");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <span className="brand-mark">
          <LockKeyhole size={24} />
        </span>
        <span className="eyebrow">PRIVATE JUDGE DEMO</span>
        <h2>Step into the workspace.</h2>
        <p className="muted">
          Use the access code supplied with the submission. You’ll be able to
          try both the buyer and seller views.
        </p>
        <div className="field">
          <label htmlFor="key">Demo access code</label>
          <input
            type="password"
            id="key"
            autoComplete="current-password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
          />
        </div>
        {error && <Notice error>{error}</Notice>}
        <Button disabled={busy} type="submit">
          {busy ? "Signing in…" : "Open workspace"} <ArrowRight size={16} />
        </Button>
        <div className="session-explainer">
          <ShieldCheck size={18} />
          <p>
            <strong>Your own private demo session</strong>
            <br />
            Sessions last 8 hours. Signing in again starts a new workspace.
            Download your evidence packet before you leave.
          </p>
        </div>
        <p className="fine-print">
          Test funds only. No real-money escrow. Your agreements are not
          publicly listed.
        </p>
      </form>
    </div>
  );
}
