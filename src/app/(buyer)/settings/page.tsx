import {
  CheckCircle2,
  Circle,
  CreditCard,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { paypalConfigured, paymentMode } from "@/lib/paypal";
export default function Page() {
  const paypal = paypalConfigured();
  const ai = !!process.env.OPENAI_API_KEY;
  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <div className="eyebrow">INTEGRATIONS</div>
          <h1>Connect the real workflow.</h1>
          <p>
            Keys stay on the server. Your interface shows which mode is running.
          </p>
        </div>
      </div>
      <div className="integration-grid">
        {[
          {
            icon: CreditCard,
            title: "PayPal sandbox",
            ready: paypal,
            desc: "Authorize with Orders v2. Capture after human approval with Payments v2.",
            vars: [
              "PAYMENT_MODE=sandbox",
              "PAYPAL_ENV=sandbox",
              "PAYPAL_CLIENT_ID",
              "PAYPAL_CLIENT_SECRET",
              "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
            ],
          },
          {
            icon: Sparkles,
            title: "AI evidence reviewer",
            ready: ai,
            desc: "Structured milestone generation and criterion-by-criterion submission review.",
            vars: [
              "OPENAI_API_KEY",
              "OPENAI_MODEL",
              "OPENAI_BASE_URL (optional)",
            ],
          },
        ].map((x) => (
          <section className="card form-card" key={x.title}>
            <span className="stat-icon mint">
              <x.icon size={22} />
            </span>
            <h2>{x.title}</h2>
            <div className={`connection-state ${x.ready ? "green-text" : ""}`}>
              {x.ready ? <CheckCircle2 size={16} /> : <Circle size={16} />}{" "}
              {x.ready
                ? "Credentials configured · not connectivity-tested"
                : "Not configured"}
            </div>
            <p className="muted">{x.desc}</p>
            <h4>Set in your local .env</h4>
            <pre>{x.vars.join("\n")}</pre>
          </section>
        ))}
      </div>
      <section className="card form-card">
        <h3>
          <KeyRound size={19} />
          Workspace configuration
        </h3>
        <p>
          New agreements use <strong>{paymentMode()}</strong> mode. Existing
          agreements keep the mode they were created with.
        </p>
        <p>
          Copy <code>.env.example</code> to <code>.env</code>, fill in the
          variables, and restart the app. Set <code>BUYER_ACCESS_KEY</code>{" "}
          before exposing the app beyond localhost.
        </p>
        <h4>Sandbox assumptions</h4>
        <ul className="readable-list">
          <li>
            Authorize each milestone near delivery. Authorizations expire;
            reauthorization is not implemented.
          </li>
          <li>
            Capture settles to your configured sandbox merchant. The seller
            email is collaboration metadata, not a payout destination.
          </li>
          <li>
            Paylock is a milestone authorization prototype. It is not regulated
            escrow, a marketplace payout service, or a PayPal dispute service.
          </li>
          <li>
            External URLs are not fetched. A supported criterion is evidence in
            submitted text, not proof of real-world completion.
          </li>
        </ul>
        <div className="button-row">
          <a
            className="text-link"
            href="https://developer.paypal.com/dashboard/"
            target="_blank"
            rel="noreferrer"
          >
            PayPal Developer Dashboard ↗
          </a>
          <a
            className="text-link"
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
          >
            OpenAI API keys ↗
          </a>
        </div>
      </section>
    </div>
  );
}
