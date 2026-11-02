"use client";
import { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "./ui/button";
import { Notice } from "./common";

export function AccountLogin({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function enterDemoRole(role: "buyer" | "seller") {
    if (!code.trim()) {
      setError("Enter the demo access code to open a pre-connected role.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await fetch("/api/demo-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, code: code.trim() }),
      });
      const body = await result.json();
      if (!result.ok)
        throw new Error(body.error || "Unable to open demo workspace.");
      const target =
        role === "seller"
          ? next.startsWith("/seller/")
            ? next
            : "/seller"
          : next.startsWith("/seller/")
            ? "/agreements"
            : next;
      window.location.assign(target);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="card form-card">
      <span className="eyebrow">JUDGE QUICK ACCESS · PAYPAL SANDBOX</span>
      <h2>Step into the workspace.</h2>
      <p className="muted">
        Enter the submission access code to open the pre-configured Buyer
        workspace or the PayPal-connected Seller account in one click.
      </p>
      <div className="field">
        <label htmlFor="quick-code">Demo access code</label>
        <input
          id="quick-code"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste judge access code"
          autoComplete="off"
        />
      </div>
      {error && <Notice error>{error}</Notice>}
      <div className="button-row">
        <Button
          type="button"
          disabled={busy}
          onClick={() => enterDemoRole("buyer")}
        >
          {busy ? "Opening…" : "Enter as Buyer"} <ArrowRight size={16} />
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => enterDemoRole("seller")}
        >
          <KeyRound size={15} />
          Enter as Connected Seller
        </Button>
      </div>
      <p className="fine-print">
        Once signed in with the access code, you can switch between Buyer and
        Connected Seller at any time from the top bar.
      </p>
      <details className="demo-restart">
        <summary>Or sign in with email & password</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const fields = new FormData(e.currentTarget);
            try {
              const result = await fetch(
                `/api/auth/${signup ? "sign-up" : "sign-in"}/email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-paylock-access-code": String(fields.get("code") || ""),
                  },
                  body: JSON.stringify({
                    name: fields.get("name"),
                    email: fields.get("email"),
                    password: fields.get("password"),
                    rememberMe: true,
                  }),
                },
              );
              const body = await result.json();
              if (!result.ok)
                throw new Error(body.message || "Unable to sign in.");
              window.location.assign(next);
            } catch (error) {
              setError((error as Error).message);
              setBusy(false);
            }
          }}
        >
          {signup && (
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : undefined}
              maxLength={128}
            />
          </div>
          {signup && (
            <div className="field">
              <label htmlFor="code">Beta access code</label>
              <input
                id="code"
                name="code"
                type="password"
                required
                autoComplete="off"
              />
              <small>Use the private code provided by the demo owner.</small>
            </div>
          )}
          <div className="button-row">
            <Button disabled={busy} type="submit">
              {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setSignup(!signup);
                setError("");
              }}
            >
              {signup
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </Button>
          </div>
        </form>
      </details>
      <p className="fine-print">PayPal sandbox only. No real-money escrow.</p>
    </div>
  );
}
