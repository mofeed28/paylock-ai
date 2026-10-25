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
          <p>Review invitations, get buyer approval, and deliver your work.</p>
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
          <p>Request access here. The buyer then approves your account.</p>
        </div>
        {invitations.length ? (
          <div className="seller-inbox-grid">
            {invitations.map((invitation, index) => {
              const pending = invitation.accessRequests.some(
                (r) => r.status === "PENDING",
              );
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
                    {pending
                      ? "Waiting for buyer approval"
                      : "You have a new invitation"}
                  </h3>
                  <p>
                    {pending
                      ? "Your request is saved. The buyer must approve your account before you can see the agreement."
                      : "A buyer invited your Paylock email. Request access to join; agreement details stay private until approval."}
                  </p>
                  <Link
                    className="button outline"
                    href={`/seller/${invitation.sellerToken}`}
                  >
                    {pending ? "Check approval status" : "Review invitation"}
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
                Ask the buyer to use your Paylock email above, or open the
                invitation link they shared. Invitations expire after seven
                days.
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
          <p>Agreements the buyer has approved you to access.</p>
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
                      : "APPROVED ACCESS"}
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
              <strong>No approved work yet</strong>
              <p>
                Once a buyer approves your request, the agreement and its
                milestones appear here.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
