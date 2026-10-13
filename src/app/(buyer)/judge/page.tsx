import Link from "next/link";
import { modelName, modelProvider } from "@/lib/model";

export default function Page() {
  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PAYLOCK · JUDGES' DEMO</div>
          <h1>See the work behind the payment.</h1>
          <p>
            Verify a delivery, request a correction, and follow the payment
            decision.
          </p>
        </div>
      </div>
      <section className="card form-card">
        <h2>1. Try the browser agent</h2>
        <p>
          A product page has a broken purchase destination. Run verification,
          inspect the screenshots, then submit the corrected sample and recheck.
          You choose whether to delegate the simulated payment.
        </p>
        <p className="muted">
          The sample uses real Chromium inspection of bundled pages and
          simulated payments. When available, the connected model chooses
          browser tools; any fallback is labeled.
        </p>
        <Link className="text-link" href="/agent">
          Open the browser walkthrough →
        </Link>
      </section>
      <section className="card form-card">
        <h2>2. Test PayPal sandbox checkout</h2>
        <p>
          Create a small agreement, authorize a milestone through PayPal, open
          its seller link to submit evidence, then return to review and approve
          capture.
        </p>
        <p className="muted">
          Use the separate Personal sandbox buyer credentials supplied with the
          private judging instructions. Sandbox transactions use test funds. The
          sample walkthrough does not exercise PayPal APIs.
        </p>
        <Link className="text-link" href="/agreements/new">
          Create a sandbox agreement →
        </Link>
      </section>
      <section className="card form-card">
        <h2>Your demo session</h2>
        <p>
          In the hosted judge demo, each sign-in starts a separate workspace.
          Keep this browser session open to revisit your work; signing in again
          starts fresh. Seller links work within that session.
        </p>
        <p className="muted">
          Configured AI:{" "}
          {modelProvider() === "bedrock"
            ? "Amazon Bedrock"
            : "OpenAI compatible"}{" "}
          · {modelName()}. Configuration alone does not confirm model access. AI
          allowances are limited; unavailable reviews remain clearly labeled for
          manual inspection.
        </p>
        <p className="fine-print">
          Use test project information only. This is a hackathon demonstration,
          with no real-money payments or escrow service.
        </p>
      </section>
    </div>
  );
}
