import { ArrowRight, FileCheck2 } from "lucide-react";
import { DemoButton } from "@/components/common";
import Link from "next/link";
export default function Page() {
  return (
    <div className="page focused-workspace">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE PAYLOCK WALKTHROUGH</div>
          <h1>One missing detail. One better decision.</h1>
          <p>Follow a $300 website milestone from evidence to approval.</p>
        </div>
      </div>
      <section className="focus-card">
        <div className="focus-copy">
          <span className="focus-kicker">
            <FileCheck2 size={17} />
            NORTHSTAR · PRODUCT PAGE DELIVERY
          </span>
          <h2>
            The seller says it’s done. The source tells a different story.
          </h2>
          <p>
            The product heading and purchase link are there. The promised
            delivery note is missing. Inspect the finding, request a revision,
            and approve the corrected work.
          </p>
          <DemoButton label="Open website walkthrough" />
          <small>
            Reopens your latest walkthrough. No duplicate sample projects.
          </small>
        </div>
        <ol className="journey-list">
          {[
            ["Review the source", "Two of three requirements are present."],
            ["Request the fix", "Your feedback is saved for the seller."],
            ["Inspect the revision", "The corrected HTML is checked again."],
            ["Approve payment", "A simulated $300 capture gets a receipt."],
          ].map(([title, text], i) => (
            <li key={title}>
              <span>{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className="integration-grid">
        <section className="card form-card">
          <h3>What this demo proves</h3>
          <p className="muted">
            HTML source is parsed on the server. Findings are computed from the
            submitted artifact, with its fingerprint preserved in the review.
            Original and revised submissions stay in the record.
          </p>
          <p className="muted">
            Without a model key, these are automated source checks. With a model
            connected, AI interprets the evidence alongside those checks.
            Neither can approve a payment.
          </p>
        </section>
        <section className="card form-card">
          <h3>What still needs a connected test</h3>
          <p className="muted">
            Practice payments are simulated. Configure PayPal and a model, then
            create a sandbox agreement to test the real authorization and
            capture flow. Source checks do not establish that a website is
            deployed or its checkout works.
          </p>
          <Link className="text-link" href="/settings">
            Connect integrations <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <details className="demo-restart">
        <summary>Start another walkthrough</summary>
        <p>
          Your existing record is kept. Use this when you want to repeat the
          full sequence.
        </p>
        <DemoButton fresh label="Create a fresh walkthrough" />
      </details>
    </div>
  );
}
