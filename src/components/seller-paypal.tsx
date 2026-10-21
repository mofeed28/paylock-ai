"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Notice } from "./common";
import { Button } from "./ui/button";

export function SellerPayPal({
  connection,
}: {
  connection: {
    configured: boolean;
    status: string;
    merchantId: string | null;
    checkedAt: string | null;
  };
}) {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function run(connect: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (connect) {
        const result = await api<{ url: string }>("paypal/seller/connect", {
          consent,
        });
        window.location.assign(result.url);
      } else {
        const result = await api<{ status: string }>(
          "paypal/seller/refresh",
          {},
        );
        setMessage(
          result.status === "READY"
            ? "PayPal confirmed your account can receive sandbox payments."
            : "PayPal still needs you to finish setup, confirm your email, or grant payment permission. Continue setup below.",
        );
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    NOT_CONNECTED: "Not connected",
    PENDING: "Setup started",
    READY: "Connected for sandbox payments",
    ACTION_REQUIRED: "Finish setup on PayPal",
    CHECK_FAILED: "Connection needs checking",
  };
  return (
    <section className="card form-card" id="paypal-connection">
      <span className="eyebrow">RECEIVE PAYMENTS · PAYPAL SANDBOX</span>
      <h2>Your PayPal connection</h2>
      <p>
        Connect the PayPal account that should receive payment for work you
        deliver. Buyers sign in to PayPal during checkout; they do not need to
        connect here.
      </p>
      <p>
        <strong>{labels[connection.status] || "Not connected"}</strong>
      </p>
      {connection.merchantId && (
        <p className="fine-print">
          PayPal merchant ID: {connection.merchantId}
        </p>
      )}
      {connection.checkedAt && (
        <p className="fine-print">
          Last checked: {new Date(connection.checkedAt).toLocaleString()}
        </p>
      )}
      {!connection.configured ? (
        <Notice>
          Seller onboarding is awaiting platform setup by the demo operator.
          Existing demo payments use the configured test merchant.
        </Notice>
      ) : (
        <>
          <label className="fine-print">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{" "}
            I agree to share a connection reference with PayPal and let Paylock
            verify my merchant identity and payment permissions.
          </label>
          <div className="button-row">
            <Button disabled={busy || !consent} onClick={() => run(true)}>
              {busy
                ? "Please wait…"
                : connection.status === "NOT_CONNECTED"
                  ? "Connect PayPal"
                  : "Continue PayPal setup"}
            </Button>
            {connection.status !== "NOT_CONNECTED" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => run(false)}
              >
                Check connection
              </Button>
            )}
          </div>
          <p className="fine-print">
            Sign in and grant permission on PayPal, then return here and select
            Check connection. Your PayPal password stays with PayPal. You can
            revoke Paylock’s permissions in your PayPal account.
          </p>
          <p className="fine-print">
            <a
              href="https://www.paypal.com/us/legalhub/paypal/seller-protection"
              target="_blank"
              rel="noreferrer"
            >
              Read PayPal’s Seller Protection policy ↗
            </a>
            . Eligibility depends on PayPal’s requirements; connecting does not
            guarantee protection.
          </p>
        </>
      )}
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
    </section>
  );
}
