"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileCheck2, Plus, Search } from "lucide-react";
import type { AgreementView } from "@/lib/data";
import { money, date } from "@/lib/utils";
import { Button } from "./ui/button";
import { Status } from "./common";
import { WEBSITE_DEMO_TITLE } from "@/lib/website-sample";
import { AGENT_DEMO_TITLE } from "@/lib/agent-fixture";

export function Dashboard({
  agreements,
  listing = false,
}: {
  agreements: AgreementView[];
  listing?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [showOlderSamples, setShowOlderSamples] = useState(false);
  const demo =
    agreements.find(
      (a) => a.aiSource === "demo" && a.title === AGENT_DEMO_TITLE,
    ) ||
    agreements.find(
      (a) => a.aiSource === "demo" && a.title === WEBSITE_DEMO_TITLE,
    );
  const olderSamples = agreements.filter(
    (a) => a.aiSource === "demo" && a.id !== demo?.id,
  );
  const visible = agreements.filter(
    (a) => showOlderSamples || a.aiSource !== "demo" || a.id === demo?.id,
  );
  const pending = visible.filter((a) =>
    a.milestones.some((m) => m.status === "IN_REVIEW"),
  );
  const featured =
    pending.find((a) => a.aiSource !== "demo") || demo || pending[0];
  const next = featured?.milestones.find((m) =>
    ["IN_REVIEW", "REVISION_REQUESTED"].includes(m.status),
  );
  const shown = visible.filter(
    (a) =>
      `${a.title} ${a.sellerEmail}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" ||
        (filter === "Needs review" &&
          a.milestones.some((m) => m.status === "IN_REVIEW")) ||
        (filter === "Completed" && a.status === "COMPLETED")),
  );
  return (
    <div className="page focused-workspace">
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORK AGREED. PAYMENT EARNED.</div>
          <h1>
            {listing ? "Your agreements" : "Pay for work you can verify."}
          </h1>
          <p>
            {listing
              ? "One place for the work, evidence, and your next decision."
              : "Check the evidence. Request what’s missing. Approve with confidence."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/agreements/new">
            <Plus size={17} />
            New agreement
          </Link>
        </Button>
      </div>
      <section className="focus-card">
        <div className="focus-copy">
          <span className="focus-kicker">
            <FileCheck2 size={17} />
            {next
              ? "YOUR NEXT DECISION"
              : "START WITH A TWO-MINUTE WALKTHROUGH"}
          </span>
          <h2>
            {next
              ? next.status === "REVISION_REQUESTED"
                ? "A revision is on the way."
                : "Is the work ready to pay for?"
              : "Let the agent verify the work."}
          </h2>
          <p>
            {next && featured
              ? `${featured.title} · ${next.title}`
              : "A product page looks finished, but its purchase link is broken. Watch the browser agent inspect, request a fix, and recheck."}
          </p>
          {next && featured ? (
            <Button asChild>
              <Link href={`/agreements/${featured.id}?milestone=${next.id}`}>
                {next.status === "REVISION_REQUESTED"
                  ? "Continue revision"
                  : "Review submitted work"}
                <ArrowRight size={16} />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/agent">
                Try the browser agent
                <ArrowRight size={16} />
              </Link>
            </Button>
          )}
          <small>
            {featured?.paymentMode === "sandbox"
              ? "PayPal sandbox · test funds"
              : "Practice walkthrough · simulated payments"}
          </small>
        </div>
        <ol className="journey-list">
          {[
            ["Agree", "Specific deliverables and a clear price."],
            ["Authorize", "Buyer authorizes a milestone payment."],
            [
              "Verify",
              "Browser tools gather evidence. AI plans when connected.",
            ],
            ["Pay", "Your approval or saved policy controls capture."],
          ].map(([title, description], i) => (
            <li key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="work-list">
        <div className="work-list-heading">
          <div>
            <h2>{listing ? "All work" : "In your workspace"}</h2>
            <p>
              {pending.length
                ? `${pending.length} agreement${pending.length === 1 ? "" : "s"} awaiting review`
                : "Your saved agreements and sample walkthrough"}
            </p>
          </div>
          <Link href="/agent" className="text-link">
            About the demo <ArrowRight size={15} />
          </Link>
        </div>
        <div className="work-toolbar">
          <div className="tabs">
            {["All", "Needs review", "Completed"].map((t) => (
              <button
                aria-pressed={filter === t}
                className={filter === t ? "selected" : ""}
                key={t}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search agreements"
              placeholder="Search agreements"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="agreement-cards">
          {shown.map((a) => {
            const count = a.milestones.filter(
              (m) => m.status === "RELEASED",
            ).length;
            const status =
              a.status === "COMPLETED"
                ? "COMPLETED"
                : a.milestones.some((m) => m.status === "DISPUTED")
                  ? "DISPUTED"
                  : a.milestones.some((m) => m.status === "IN_REVIEW")
                    ? "IN_REVIEW"
                    : "ACTIVE";
            return (
              <Link
                key={a.id}
                href={`/agreements/${a.id}`}
                className="agreement-tile"
              >
                <div className="tile-top">
                  <span>
                    {a.aiSource === "demo"
                      ? "SAMPLE PROJECT"
                      : a.paymentMode === "practice"
                        ? "PRACTICE AGREEMENT"
                        : "PAYPAL SANDBOX"}
                  </span>
                  <Status value={status} />
                </div>
                <h3>{a.title}</h3>
                <p>{a.sellerEmail}</p>
                <div className="tile-progress">
                  {a.milestones.map((m) => (
                    <span
                      key={m.id}
                      className={
                        m.status === "RELEASED"
                          ? "done"
                          : m.status === "IN_REVIEW"
                            ? "review"
                            : ""
                      }
                    />
                  ))}
                </div>
                <div className="tile-bottom">
                  <span>
                    {count === a.milestones.length && <Check size={14} />}{" "}
                    {count}/{a.milestones.length} milestones paid ·{" "}
                    {date(a.createdAt)}
                  </span>
                  <strong>
                    {money(a.totalAmount)} <ArrowRight size={17} />
                  </strong>
                </div>
              </Link>
            );
          })}
        </div>
        {!shown.length && (
          <div className="card empty">
            <FileCheck2 size={28} />
            <h3>
              {agreements.length
                ? "No matching agreements"
                : "Your workspace is ready"}
            </h3>
            <p>
              {agreements.length
                ? "Try another search or filter."
                : "Start the walkthrough above or create your first agreement."}
            </p>
          </div>
        )}
        {olderSamples.length > 0 && (
          <label className="sample-toggle">
            <input
              type="checkbox"
              checked={showOlderSamples}
              onChange={(e) => setShowOlderSamples(e.target.checked)}
            />
            Show {olderSamples.length} earlier sample{" "}
            {olderSamples.length === 1 ? "agreement" : "agreements"}
          </label>
        )}
      </section>
    </div>
  );
}
