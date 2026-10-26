"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [accountId, setAccountId] = useState("");
  const invitation = a.accessRequests.find((r) => r.status === "INVITED");
  const declined = a.accessRequests.some((r) => r.status === "DECLINED");
  const expired =
    !a.sellerInviteExpiresAt || new Date(a.sellerInviteExpiresAt) <= new Date();
  async function act(action: "invite" | "renew") {
    setBusy(true);
    setError("");
    try {
      await api(`agreements/${a.id}/seller-access`, {
        action,
        ...(action === "invite" ? { accountId } : {}),
      });
      setConfirmed(false);
      setIdentityConfirmed(false);
      setAccountId("");
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
      className="card form-card seller-invitation-panel"
      aria-label="Seller access"
    >
      <h3>
        {a.sellerUser
          ? `Seller: ${a.sellerUser.name}`
          : invitation
            ? expired
              ? "Invitation expired"
              : "Waiting for seller acceptance"
            : "Invite your seller"}
      </h3>
      {a.sellerUser ? (
        <p>
          This account can view the scope and submit evidence. Only you can
          approve payment.
        </p>
      ) : invitation ? (
        <p>
          {invitation.user.name} · {invitation.user.email}.{" "}
          {expired
            ? "Renew this invitation to send it again."
            : "They accept or decline in their seller inbox. No further approval from you is needed."}
        </p>
      ) : declined ? (
        <p>
          This invitation is closed. Renew it below before inviting the seller
          again.
        </p>
      ) : (
        <>
          <p>
            Invite the account belonging to {a.sellerEmail}. Ask your seller to
            copy their account ID from their Account page and send it to you
            directly.
          </p>
          <div className="field">
            <label htmlFor="invite-account-id">
              Seller’s Paylock account ID
            </label>
            <input
              id="invite-account-id"
              value={accountId}
              maxLength={128}
              onChange={(e) => {
                setAccountId(e.target.value);
                setIdentityConfirmed(false);
              }}
            />
          </div>
          <label className="invitation-confirmation">
            <input
              type="checkbox"
              checked={identityConfirmed}
              onChange={(e) => setIdentityConfirmed(e.target.checked)}
            />{" "}
            I received this account ID directly from my seller.
          </label>
          <Button
            disabled={busy || !identityConfirmed || !accountId.trim()}
            onClick={() => act("invite")}
          >
            Invite this seller
          </Button>
          <small>
            Choosing the recipient is your approval. The seller accepts once to
            join; PayPal connection and payment approval are separate.
          </small>
        </>
      )}
      {(a.sellerUser || invitation) && (
        <CopyButton value={`/seller/${a.sellerToken}?milestone=${milestone}`} />
      )}
      <small>
        No email is sent automatically. Invitations expire after seven days;
        accepted access continues until revoked.
      </small>
      <details>
        <summary>Revoke access or renew invitation</summary>
        <p>
          This removes seller access and invalidates the old invitation. Saved
          work and payment records stay intact. You will choose the recipient
          again.
        </p>
        <label className="invitation-confirmation">
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
  title,
}: {
  token: string;
  userId: string;
  status?: string;
  title?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function respond(action: "accept" | "decline") {
    setBusy(true);
    setError("");
    try {
      await api(`seller/${token}/respond-invitation`, { action });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page narrow">
      <section className="card form-card seller-invitation-panel">
        <span className="eyebrow">SELLER INVITATION</span>
        <h1>
          {status === "INVITED"
            ? "You’re invited to deliver this work."
            : status === "DECLINED"
              ? "This invitation is closed."
              : "The buyer needs your account ID."}
        </h1>
        {status === "INVITED" ? (
          <>
            <h2>{title}</h2>
            <p>
              The buyer chose your account. Accept to open the scope and
              milestones, or decline. The buyer does not need to approve you
              again. Accepting does not authorize a payment or connect PayPal.
            </p>
            <div className="button-row">
              <Button disabled={busy} onClick={() => respond("accept")}>
                {busy ? "Saving…" : "Accept invitation"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => respond("decline")}
              >
                Decline
              </Button>
            </div>
          </>
        ) : status === "DECLINED" ? (
          <p>Ask the buyer to renew the invitation if you want to join.</p>
        ) : (
          <>
            <p>
              This older invitation used an email address only. Send your
              account ID to the buyer through your usual conversation. They
              choose your account once, then you can accept here.
            </p>
            <p>
              <strong>Your account ID:</strong> {userId}
            </p>
            <CopyButton value={userId} label="Copy account ID" />
            <Button variant="outline" onClick={() => router.refresh()}>
              Check invitation
            </Button>
          </>
        )}
        <Link className="text-link" href="/seller">
          Back to seller inbox →
        </Link>
        {error && <Notice error>{error}</Notice>}
      </section>
    </div>
  );
}
