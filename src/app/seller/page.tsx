import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Inbox, ShieldCheck } from "lucide-react";
import { currentAccount } from "@/lib/auth";
import { sellerInbox } from "@/lib/seller-inbox";
import { sellerPayPalStatus } from "@/lib/seller-paypal";
import { money } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentAccount();
  if (!user) redirect("/login");
  const [{ agreements, invitations }, paypal] = await Promise.all([
    sellerInbox(user.id),
    sellerPayPalStatus(user.id),
  ]);
  const connected = paypal.status === "READY";
  return (
    <div className="page seller-inbox-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SELLER WORKSPACE</span>
          <h1>Your seller inbox</h1>
          <p>Accept invitations and deliver your work.</p>
          <p className="fine-print">Signed in as {user.email}</p>
        </div>
        <Link className="text-link" href="/agreements">
          Switch to buyer view →
        </Link>
      </div>
      <aside className="card seller-payment-summary">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>
            {connected
              ? "PayPal connected for sandbox payments"
              : "Set up where you receive payment"}
          </strong>
          <p>
            {connected
              ? "Your connection was verified. PayPal checks it again before each payment."
              : "Connect your PayPal account before a buyer authorizes payment."}
          </p>
        </div>
        <Link className="text-link" href="/account#paypal-connection">
          {connected ? "Manage connection" : "Connect PayPal"} →
        </Link>
      </aside>
      <section
        className="seller-inbox-section"
        aria-labelledby="seller-invitations"
      >
        <div className="seller-section-heading">
          <h2 id="seller-invitations">
            Invitations{" "}
            <span className="seller-count">{invitations.length}</span>
          </h2>
          <p>The buyer chooses your account. You accept once to join.</p>
        </div>
        {invitations.length ? (
          <div className="seller-inbox-grid">
            {invitations.map((invitation, index) => {
              const status = invitation.accessRequests[0]?.status;
              return (
                <article className="card seller-work-card" key={invitation.id}>
                  <span className="eyebrow">
                    INVITATION {index + 1} ·{" "}
                    {invitation.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                  <h3>
                    {status === "INVITED"
                      ? "Ready for your acceptance"
                      : status === "DECLINED"
                        ? "Invitation closed"
                        : "Share your account ID"}
                  </h3>
                  <p>
                    {status === "INVITED"
                      ? "Accept or decline. No second buyer approval is needed."
                      : status === "DECLINED"
                        ? "The buyer must renew this invitation before you can join."
                        : "This invitation uses your email only. Share your account ID so the buyer can choose your account."}
                  </p>
                  <Link
                    className="button outline"
                    href={`/seller/${invitation.sellerToken}`}
                  >
                    Review invitation
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card seller-inbox-empty">
            <Inbox size={22} aria-hidden="true" />
            <div>
              <strong>No pending invitations</strong>
              <p>
                Share your Paylock email and account ID from your Account page
                with the buyer. Invitations expire after seven days.
              </p>
            </div>
          </div>
        )}
      </section>
      <section
        className="seller-inbox-section"
        aria-labelledby="seller-deliveries"
      >
        <div className="seller-section-heading">
          <h2 id="seller-deliveries">
            Your work <span className="seller-count">{agreements.length}</span>
          </h2>
          <p>Agreements you have joined as the seller.</p>
        </div>
        {agreements.length ? (
          <div className="seller-inbox-grid">
            {agreements.map((a) => {
              const paid = a.milestones.filter(
                (m) => m.status === "RELEASED",
              ).length;
              return (
                <article className="card seller-work-card" key={a.id}>
                  <span className="eyebrow">
                    {paid === a.milestones.length
                      ? "COMPLETED"
                      : "SELLER ACCESS"}
                  </span>
                  <h3>{a.title}</h3>
                  <p>Buyer: {a.buyerName}</p>
                  <div className="seller-work-meta">
                    <span>
                      {paid}/{a.milestones.length} milestones paid
                    </span>
                    <strong>{money(a.totalAmount)}</strong>
                  </div>
                  <Link
                    className="button outline"
                    href={`/seller/${a.sellerToken}?milestone=${a.milestones.find((m) => m.status !== "RELEASED")?.id || a.milestones[0]?.id || ""}`}
                  >
                    Open delivery workspace
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card seller-inbox-empty">
            <Inbox size={22} aria-hidden="true" />
            <div>
              <strong>No work joined yet</strong>
              <p>
                Once you accept an invitation, the agreement and its milestones
                appear here.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
