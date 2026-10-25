"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgreementView } from "@/lib/data";
import { api, CopyButton, Notice } from "./common";
import { Button } from "./ui/button";

export function SellerAccess({
  agreement: a,
  milestone,
}: {
  agreement: AgreementView;
  milestone: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  async function act(action: "approve" | "renew", requestId?: string) {
    setBusy(true);
    setError("");
    try {
      await api(`agreements/${a.id}/seller-access`, { action, requestId });
      setConfirmed(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="seller-access"
      className="card form-card"
      aria-label="Seller access"
    >
      <h3>
        {a.sellerUser ? `Seller: ${a.sellerUser.name}` : "Invite your seller"}
      </h3>
      <p>
        {a.sellerUser
          ? "This account can view the scope and submit evidence. Only you can approve payment."
          : `An invitation appears in the seller inbox for ${a.sellerEmail}. You can also copy and share the link. They request access; approve their account here to let them see the work.`}
      </p>
      <CopyButton value={`/seller/${a.sellerToken}?milestone=${milestone}`} />
      <small>
        Invitation{" "}
        {a.sellerInviteExpiresAt
          ? `expires ${new Date(a.sellerInviteExpiresAt).toLocaleDateString()}`
          : "needs renewal"}
        . No email is sent automatically.
      </small>
      {!a.sellerUser &&
        a.accessRequests
          .filter((r) => r.status === "PENDING")
          .map((r) => (
            <div className="notice" key={r.id}>
              <div>
                <strong>{r.user.name}</strong>
                <p>{r.user.email} · Email not verified</p>
                <small>Account ID: {r.user.id}</small>
                <p>
                  Confirm this account ID directly with your seller before
                  granting access.
                </p>
                <Button disabled={busy} onClick={() => act("approve", r.id)}>
                  Approve this seller account
                </Button>
              </div>
            </div>
          ))}
      <details>
        <summary>Revoke access or renew invitation</summary>
        <p>
          This removes the current seller’s access, clears requests and
          invalidates the old invitation. Saved work and payment records stay
          intact.
        </p>
        <label>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          I want to revoke access and create a new invitation.
        </label>
        <Button
          variant="outline"
          disabled={busy || !confirmed}
          onClick={() => act("renew")}
        >
          Revoke & renew invitation
        </Button>
      </details>
      {error && <Notice error>{error}</Notice>}
    </section>
  );
}

export function SellerInvitation({
  token,
  userId,
  status,
}: {
  token: string;
  userId: string;
  status?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="page narrow">
      <section className="card form-card">
        <span className="eyebrow">SELLER INVITATION</span>
        <h1>
          {status === "PENDING"
            ? "Waiting for the buyer."
            : "Request access to this agreement."}
        </h1>
        <p>
          The scope and evidence stay private until the buyer approves your
          account. Send the buyer this account ID through your usual
          conversation.
        </p>
        <p>
          <strong>Your account ID:</strong> {userId}
        </p>
        {status === "DECLINED" ? (
          <Notice>
            The buyer approved another account. Ask them to renew the invitation
            if this was a mistake.
          </Notice>
        ) : (
          <Button
            disabled={busy || status === "PENDING"}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api(`seller/${token}/request-access`);
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {status === "PENDING"
              ? "Access requested"
              : "Request seller access"}
          </Button>
        )}
        <Button variant="outline" onClick={() => router.refresh()}>
          Check approval status
        </Button>
        {error && <Notice error>{error}</Notice>}
      </section>
    </div>
  );
}
