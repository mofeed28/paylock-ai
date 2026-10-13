"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, Notice } from "@/components/common";
export default function Page() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
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
        <h1>Welcome to Paylock.</h1>
        <p className="muted">
          Enter the access code supplied with the demo or your local buyer
          access key.
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
          {busy ? "Signing in…" : "Open workspace"}
        </Button>
        <p className="fine-print">
          For local setup, use localhost. Remote access requires
          BUYER_ACCESS_KEY in the server environment.
        </p>
      </form>
    </div>
  );
}
