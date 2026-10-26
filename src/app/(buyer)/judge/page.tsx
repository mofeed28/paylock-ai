import Link from "next/link";
import { ArrowRight, ScanEye, ShieldCheck, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountsEnabled } from "@/lib/workspace";
export default function Page() {
  return (
    <div className="page judge-experience">
      <header className="judge-intro">
        <span className="eyebrow">YOUR PRIVATE PAYLOCK WORKSPACE</span>
        <h1>
          From “looks done”
          <br />
          to evidence you can inspect.
        </h1>
        <p>
          A delivery can look finished and still have a broken purchase link.
          Paylock checks the agreed work before you approve its payment.
        </p>
      </header>
      <section className="judge-feature card">
        <div>
          <span className="eyebrow">START HERE · NO PAYPAL LOGIN NEEDED</span>
          <h2>
            Catch the broken link.
            <br />
            Then see the fix earn payment.
          </h2>
          <p>
            Try the prepared Northstar website example. Watch the agent inspect
            the page, request a revision, and recheck the corrected delivery.
          </p>
          <Button asChild>
            <Link href="/agent">
              Try the guided demo <ArrowRight size={17} />
            </Link>
          </Button>
          <small>
            Real browser inspection · simulated payment · AI availability
            labeled in every run
          </small>
        </div>
        <ol className="demo-story" aria-label="The verification loop">
          <li>
            <ScanEye size={22} />
            <div>
              <strong>Inspect</strong>
              <p>
                Check the heading, delivery text, purchase destination and
                mobile layout.
              </p>
            </div>
          </li>
          <li>
            <ShieldCheck size={22} />
            <div>
              <strong>Request a revision</strong>
              <p>
                Show the failing check. Keep payment blocked until the required
                evidence passes.
              </p>
            </div>
          </li>
          <li>
            <ReceiptText size={22} />
            <div>
              <strong>Connect evidence to payment</strong>
              <p>
                Save the decision, browser evidence and payment record together.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <div className="demo-choices">
        {process.env.DEMO_WEBSITE_URL && (
          <section className="card form-card">
            <span className="eyebrow">TRY THE PAYPAL INTEGRATION</span>
            <h2>Verify a website. Capture $5.</h2>
            <p>
              Create a real sandbox agreement for the hosted storefront.
              Authorize test funds, submit the website from seller view, and
              inspect the AI’s evidence before payment.
            </p>
            <p className="fine-print">
              Requires your Personal PayPal sandbox login. A separate $100
              handoff milestone stays unpaid unless you authorize it.
            </p>
            <Button asChild variant="outline">
              <Link href="/agent#sandbox-website">
                Start the $5 sandbox flow <ArrowRight size={16} />
              </Link>
            </Button>
          </section>
        )}
        <section className="card form-card">
          <span className="eyebrow">BRING YOUR OWN BRIEF</span>
          <h2>You define what done means.</h2>
          <p>
            Describe the project and budget. AI drafts milestones and acceptance
            criteria; you edit and confirm them before the seller delivers.
          </p>
          <p className="fine-print">
            You are the buyer. The seller submits evidence against your
            requirements. AI advises; your payment settings decide what can
            happen.
          </p>
          <Button asChild variant="outline">
            <Link href="/agreements/new">
              Create your own agreement <ArrowRight size={16} />
            </Link>
          </Button>
        </section>
      </div>
      <section className="session-guide">
        <ShieldCheck size={22} />
        <div>
          <h3>
            {accountsEnabled()
              ? "Two people. One shared agreement."
              : "One session. Two roles. Your private workspace."}
          </h3>
          <p>
            {accountsEnabled() ? (
              "Create the agreement as the buyer, invite the seller’s account, then wait for them to accept. The seller submits work; you review and decide payment. The prepared walkthrough remains available for a quick example."
            ) : (
              <>
                Use “Switch to seller view” to submit work, then return to the
                buyer to review it. No invitation is sent. Other judges cannot
                see your agreements.
              </>
            )}
          </p>
          <p>
            {accountsEnabled()
              ? "Your workspace stays with your account when you sign out. Agreements are private to the buyer and their assigned seller."
              : "Sessions last 8 hours. Signing in again creates a new workspace. Download the evidence packet to keep a copy of your work."}
          </p>
          <Link className="text-link" href="/agreements">
            Open your agreements <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
