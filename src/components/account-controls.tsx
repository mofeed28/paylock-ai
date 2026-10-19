"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { Notice } from "./common";
export function AccountControls() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function signOut(all: boolean) {
    setBusy(true);
    setError("");
    try {
      if (all) {
        const r = await fetch("/api/auth/revoke-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!r.ok) throw new Error("Could not revoke sessions.");
      }
      const r = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!r.ok) throw new Error("Could not sign out.");
      window.location.assign("/login");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <form
        className="form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          const form = e.currentTarget;
          const data = new FormData(form);
          try {
            const r = await fetch("/api/auth/change-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                currentPassword: data.get("currentPassword"),
                newPassword: data.get("newPassword"),
                revokeOtherSessions: true,
              }),
            });
            const body = await r.json();
            if (!r.ok)
              throw new Error(body.message || "Could not change password.");
            form.reset();
            setMessage(
              "Password changed. Other sessions have been signed out.",
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Change password</h3>
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </div>
        <div className="field">
          <label htmlFor="newPassword">
            New password · at least 12 characters
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </div>
        <Button disabled={busy} type="submit">
          Update password
        </Button>
      </form>
      {message && <Notice>{message}</Notice>}
      <Button disabled={busy} onClick={() => signOut(false)}>
        Sign out
      </Button>
      <Button disabled={busy} variant="outline" onClick={() => signOut(true)}>
        Sign out on all devices
      </Button>
      {error && <Notice error>{error}</Notice>}
    </>
  );
}
