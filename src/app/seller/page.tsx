import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Inbox, CheckCircle2, FolderOpen } from "lucide-react";
import { currentAccount } from "@/lib/auth";
import { sellerInbox } from "@/lib/seller-inbox";
import { sellerPayPalStatus } from "@/lib/seller-paypal";
import { CopyButton } from "@/components/common";
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
    <div className="page seller-hub">
      <header className="seller-hub-heading">
        <div>
          <h1>Your seller workspace</h1>
          <p>Accept work. Submit delivery. Track progress.</p>
        </div>
        <Link
          className={`seller-connection ${connected ? "is-connected" : ""}`}
          href="/account#paypal-connection"
        >
          {connected && <CheckCircle2 size={16} />}
          {connected ? "PayPal connected" : "Connect PayPal"}
          <ArrowRight size={14} />
        </Link>
      </header>
      <section
        className="seller-hub-section"
        aria-labelledby="seller-invitations"
      >
        <div className="seller-hub-section-title">
          <h2 id="seller-invitations">
            Invitations <span>{invitations.length}</span>
          </h2>
        </div>
        <div className="seller-row-list">
          {invitations.length ? (
            invitations.map((invitation) => {
              const status = invitation.accessRequests[0]?.status;
              return (
                <article className="seller-invite-row" key={invitation.id}>
                  <div className="seller-row-icon">
                    <Inbox size={20} />
                  </div>
                  <div className="seller-row-copy">
                    <h3>
                      {status === "INVITED"
                        ? "Ready for your acceptance"
                        : status === "DECLINED"
                          ? "Invitation closed"
                          : "One detail needed to join"}
                    </h3>
                    <p>
                      {status === "INVITED"
                        ? "Review and accept to start work."
                        : status === "DECLINED"
                          ? "Ask the buyer for a new invitation."
                          : "Share your account ID with the buyer to receive this work."}
                    </p>
                    <time dateTime={invitation.createdAt.toISOString()}>
                      {invitation.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                  </div>
                  <Link
                    className="button button-outline"
                    href={`/seller/${invitation.sellerToken}`}
                  >
                    Review invitation
                    <ArrowRight size={15} />
                  </Link>
                </article>
              );
            })
          ) : (
            <div className="seller-quiet-empty">
              <Inbox size={20} />
              <p>You’re all caught up. New invitations will appear here.</p>
            </div>
          )}
        </div>
      </section>
      <section
        className="seller-hub-section"
        aria-labelledby="seller-deliveries"
      >
        <div className="seller-hub-section-title">
          <h2 id="seller-deliveries">
            Your work <span>{agreements.length}</span>
          </h2>
        </div>
        <div className="seller-row-list">
          {agreements.length ? (
            agreements.map((a) => {
              const paid = a.milestones.filter(
                (m) => m.status === "RELEASED",
              ).length;
              const complete =
                a.milestones.length > 0 && paid === a.milestones.length;
              return (
                <article className="seller-delivery-row" key={a.id}>
                  <div className="seller-row-copy">
                    <span
                      className={`seller-work-state ${complete ? "is-complete" : ""}`}
                    >
                      {complete ? "Completed" : "In progress"}
                    </span>
                    <h3>{a.title}</h3>
                    <p>
                      {a.buyerName} <span aria-hidden="true">·</span> {paid}/
                      {a.milestones.length} milestones paid
                    </p>
                  </div>
                  <div className="seller-work-value">
                    <strong>{money(a.totalAmount)}</strong>
                    <small>Agreement total</small>
                  </div>
                  <Link
                    className="button button-primary"
                    href={`/seller/${a.sellerToken}?milestone=${a.milestones.find((m) => m.status !== "RELEASED")?.id || a.milestones[0]?.id || ""}`}
                  >
                    {complete ? "View work" : "Open workspace"}
                    <ArrowRight size={15} />
                  </Link>
                </article>
              );
            })
          ) : (
            <div className="seller-quiet-empty">
              <FolderOpen size={20} />
              <p>Accept an invitation to see your work here.</p>
            </div>
          )}
        </div>
      </section>
      <details className="seller-invite-help">
        <summary>How does a buyer invite me?</summary>
        <div>
          <p>
            Send these details to your buyer. They invite your account, then you
            accept here.
          </p>
          <dl>
            <div>
              <dt>Paylock email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd>{user.id}</dd>
            </div>
          </dl>
          <CopyButton
            value={`Paylock email: ${user.email}\nAccount ID: ${user.id}`}
            label="Copy invitation details"
          />
        </div>
      </details>
    </div>
  );
}
