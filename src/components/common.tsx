"use client";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
export async function api<T = Record<string, unknown>>(
  path: string,
  data: unknown = {},
): Promise<T> {
  const r = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || "Request failed.");
  return body;
}
export function Status({ value }: { value: string }) {
  const labels: Record<string, string> = {
    PENDING: "Not started",
    IN_REVIEW: "Ready for review",
    REVISION_REQUESTED: "Revision requested",
    RELEASED: "Released",
    DISPUTED: "In dispute",
    AUTHORIZED: "Authorized",
    CAPTURED: "Captured",
    UNFUNDED: "Not authorized",
    CAPTURE_PENDING: "Capture pending",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    practice: "Practice",
    sandbox: "PayPal sandbox",
  };
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      <span className="badge-dot" />
      {labels[value] || value}
    </span>
  );
}
export function Notice({
  error,
  children,
}: {
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`notice ${error ? "notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <CircleAlert size={17} />
      <span>{children}</span>
    </div>
  );
}
export function DemoButton({
  label = "Open website walkthrough",
  className = "",
  fresh = false,
}: {
  label?: string;
  className?: string;
  fresh?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <>
      <Button
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const a = await api<{ id: string }>("demo", { fresh });
            router.push(`/agreements/${a.id}`);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? <LoaderCircle className="spin" size={16} /> : null}
        {busy ? "Preparing demo…" : label}
      </Button>
      {error && <Notice error>{error}</Notice>}
    </>
  );
}
export function CopyButton({
  value,
  label = "Copy seller link",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              value.startsWith("/") ? `${location.origin}${value}` : value,
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? <Check size={14} /> : null}
        {copied ? "Copied" : label}
      </Button>
      {error && (
        <small>Could not copy. Select and copy the value manually.</small>
      )}
    </>
  );
}
