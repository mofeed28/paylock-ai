"use client";
import { useEffect, useRef, useState } from "react";
import { api, Notice } from "./common";
import { Button } from "./ui/button";
type PayPalButtons = {
  render: (element: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
};
type PayPalSDK = {
  Buttons: (options: {
    style: Record<string, unknown>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel: () => void;
    onError: (error: unknown) => void;
  }) => PayPalButtons;
};
declare global {
  interface Window {
    paypal?: PayPalSDK;
  }
}
let sdkPromise: Promise<void> | undefined;
function loadSDK(clientId: string) {
  if (window.paypal) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=authorize&components=buttons&disable-funding=credit,card`;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = undefined;
      script.remove();
      reject(
        new Error(
          "PayPal Checkout could not load. Check your network and reload.",
        ),
      );
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}
export function PayPalButton({
  milestoneId,
  clientId,
  onSuccess,
}: {
  milestoneId: string;
  clientId: string;
  onSuccess: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onSuccess);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  async function recover() {
    setChecking(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ status: string }>(
        "paypal/recover-authorization",
        {
          milestoneId,
        },
      );
      if (["AUTHORIZED", "CAPTURED"].includes(result.status)) {
        callback.current();
      } else {
        setMessage(
          result.status === "NOT_STARTED"
            ? "Start with the PayPal button above. There is no checkout to recover yet."
            : "PayPal is still waiting for your approval. Finish checkout, then check again.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    callback.current = onSuccess;
  }, [onSuccess]);
  useEffect(() => {
    let cancelled = false;
    let buttons: PayPalButtons | undefined;
    loadSDK(clientId)
      .then(async () => {
        if (cancelled || !ref.current) return;
        buttons = window.paypal!.Buttons({
          style: {
            layout: "vertical",
            label: "paypal",
            height: 42,
            shape: "rect",
          },
          createOrder: async () => {
            const r = await api<{ id: string }>("paypal/create-order", {
              milestoneId,
            });
            return r.id;
          },
          onApprove: async (data) => {
            try {
              await api("paypal/authorize-order", {
                milestoneId,
                orderId: data.orderID,
              });
              callback.current();
            } catch (e) {
              setError((e as Error).message);
            }
          },
          onCancel: () =>
            setError("Checkout cancelled. No authorization was recorded."),
          onError: () =>
            setError(
              "PayPal Checkout could not complete. Retry safely or check your sandbox configuration.",
            ),
        });
        await buttons.render(ref.current);
      })
      .catch((e) => setError((e as Error).message));
    return () => {
      cancelled = true;
      void buttons?.close().catch(() => {});
    };
  }, [clientId, milestoneId]);
  return (
    <div className="paypal-widget">
      <div ref={ref} />
      <p className="fine-print">
        PayPal opens a secure checkout window. If it does not appear, allow
        pop-ups for this demo or use your regular browser.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={checking}
        onClick={recover}
      >
        {checking
          ? "Checking PayPal…"
          : "Already approved in PayPal? Check authorization"}
      </Button>
      <p className="fine-print">
        Use this if checkout finished but this page did not update. It checks
        your existing order and reserves approved test funds; it never captures
        payment.
      </p>
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
