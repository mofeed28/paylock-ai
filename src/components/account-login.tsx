"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { Notice } from "./common";

export function AccountLogin({ next }: { next: string }) {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="card form-card"
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
          if (!result.ok) throw new Error(body.message || "Unable to sign in.");
          window.location.assign(next);
        } catch (error) {
          setError((error as Error).message);
          setBusy(false);
        }
      }}
    >
      <span className="eyebrow">PRIVATE BETA · PERMANENT WORKSPACE</span>
      <h2>{signup ? "Make room for good work." : "Welcome back."}</h2>
      <p className="muted">
        Your agreements, evidence and payment records stay with your account.
        Sign in again to pick up where you left off.
      </p>
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
      {error && <Notice error>{error}</Notice>}
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
      <p className="fine-print">
        Email verification and password-reset emails are not available yet. Save
        your password in a password manager. Buyers invite a specific seller
        account; the seller accepts once to join.
      </p>
      <p className="fine-print">PayPal sandbox only. No real-money escrow.</p>
    </form>
  );
}
