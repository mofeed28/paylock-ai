import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Page() {
  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PAYLOCK · JUDGE DEMO</div>
          <h1>You set the requirements. The seller delivers.</h1>
          <p>
            Start as the buyer. In this demo, you can also try the seller’s
            view.
          </p>
        </div>
      </div>
      <ol className="role-journey" aria-label="How an agreement works">
        <li>
          <span>1 · BUYER</span>
          <h3>Define the work</h3>
          <p>
            You write the requirements and budget. AI drafts milestones; you
            edit and confirm them.
          </p>
        </li>
        <li>
          <span>2 · SELLER</span>
          <h3>Submit the delivery</h3>
          <p>
            The seller submits work against your requirements. AI checks the
            evidence.
          </p>
        </li>
        <li>
          <span>3 · BUYER</span>
          <h3>Make the payment decision</h3>
          <p>
            You approve payment, request a revision, or set an explicit
            permission for automatic capture.
          </p>
        </li>
      </ol>
      <div className="demo-choices">
        <section className="card form-card">
          <div className="eyebrow">START FROM YOUR REQUIREMENTS</div>
          <h2>Create your own agreement</h2>
          <p>
            Write a brief, review AI’s proposed milestones, and save. Then open
            the seller view to submit work and switch back to review it.
          </p>
          <p className="muted">
            PayPal sandbox checkout uses test funds and a Personal sandbox buyer
            login.
          </p>
          <Button asChild>
            <Link href="/agreements/new">Create an agreement →</Link>
          </Button>
        </section>
        <section className="card form-card">
          <div className="eyebrow">EXPLORE A PREPARED EXAMPLE</div>
          <h2>Try the browser walkthrough</h2>
          <p>
            The requirements and seller submission are already prepared. Let the
            agent find a broken link, then submit the corrected page and
            recheck.
          </p>
          <p className="muted">
            Real browser checks. Simulated payments. Any unavailable AI is
            labeled.
          </p>
          <Button asChild variant="outline">
            <Link href="/agent">Open the walkthrough →</Link>
          </Button>
        </section>
      </div>
      {process.env.DEMO_WEBSITE_URL && (
        <section className="card form-card">
          <h2>Try live AI with a PayPal sandbox payment</h2>
          <p>
            Use the hosted test storefront as your seller’s delivery. Confirm
            the requirements, authorize a $5 milestone, and let the browser
            agent verify it before payment.
          </p>
          <p className="muted">
            Requires a Personal PayPal sandbox login. The $100 handoff milestone
            stays separate and unpaid unless you authorize it.
          </p>
          <Link className="text-link" href="/agent#sandbox-website">
            Open the guided sandbox setup →
          </Link>
        </section>
      )}
      <section className="card form-card">
        <h2>Who can see your agreements?</h2>
        <p>
          Your agreements are private to this demo session. Other judges have
          separate workspaces. Nothing is publicly listed.
        </p>
        <p className="muted">
          You test both roles in the same session. The seller email is contact
          information; it does not send an invitation. Seller links work only in
          your current session. Keep it open to revisit your work—signing in
          again starts a new workspace.
        </p>
        <Link className="text-link" href="/agreements">
          Go to your agreements →
        </Link>
      </section>
    </div>
  );
}
