"use client";
import { useState } from "react";
import {
  ScanEye,
  ArrowRight,
  CheckCircle2,
  Circle,
  LoaderCircle,
} from "lucide-react";
import type { AgreementView } from "@/lib/data";
import type {
  AgentResult,
  AgentTrace,
  BrowserPolicy,
} from "@/lib/agent-contract";
import { money } from "@/lib/utils";
import { Button } from "./ui/button";

export function AgentPanel({
  milestone: m,
  practice,
  busy,
  run,
}: {
  milestone: AgreementView["milestones"][number];
  practice: boolean;
  busy: string;
  run: (path: string, data: unknown, label: string) => Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const policy: BrowserPolicy = JSON.parse(m.browserPolicyJson!);
  const latest = m.agentRuns[0];
  const trace: AgentTrace[] = latest ? JSON.parse(latest.traceJson) : [];
  const result: Partial<AgentResult> = latest
    ? JSON.parse(latest.resultJson)
    : {};
  const active =
    m.autoCapture &&
    !!m.autoCaptureUntil &&
    new Date(m.autoCaptureUntil) > new Date();
  const open =
    !["RELEASED", "DISPUTED"].includes(m.status) &&
    m.paymentStatus !== "CAPTURE_PENDING";
  const screenshots = [
    ...new Set(
      result.observations?.flatMap((o) =>
        o.screenshot === undefined ? [] : [o.screenshot],
      ) || [],
    ),
  ];
  return (
    <section className="card agent-panel">
      <div className="card-heading">
        <h3>
          <ScanEye size={19} /> Browser verification
        </h3>
        <span className="subtle-pill">
          {latest ? latest.status.replaceAll("_", " ") : "READY TO INSPECT"}
        </span>
      </div>
      <p className="agent-target">
        {policy.fixture
          ? "Offline Northstar sample · real Chromium inspection"
          : policy.targetUrl}
      </p>
      <div className="agent-layout">
        <div>
          <h2>
            {!latest
              ? "Let the agent inspect the submitted work."
              : latest.status === "REVISION_NEEDED"
                ? "A fix is needed before payment."
                : latest.status === "CAPTURED"
                  ? "Work verified. Payment recorded."
                  : latest.status === "VERIFIED"
                    ? "Checks passed. Your approval is next."
                    : "Human review is needed."}
          </h2>
          <p className="muted">
            {!latest
              ? "The run will show whether a live AI model or the deterministic rehearsal selected the browser checks."
              : latest.planner === "live"
                ? "Live AI chooses browser tools and uses their results to decide what to inspect next."
                : "Deterministic rehearsal: browser tools run without AI planning. Connect a model to enable the live tool loop."}
          </p>
          {latest && <p className="muted">{latest.summary}</p>}
          {result.observations && (
            <div className="agent-results">
              {result.observations.map((o) => (
                <div key={o.tool}>
                  {o.passed ? (
                    <CheckCircle2 className="check-pass" size={18} />
                  ) : (
                    <Circle className="check-fail" size={18} />
                  )}
                  <span>{o.detail}</span>
                </div>
              ))}
            </div>
          )}
          <div className="button-row">
            {m.status === "IN_REVIEW" &&
              m.paymentStatus !== "CAPTURE_PENDING" && (
                <Button
                  disabled={!!busy}
                  onClick={() =>
                    run(
                      `milestones/${m.id}/agent-run`,
                      {},
                      "Inspecting in Chromium…",
                    )
                  }
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <ScanEye size={16} />
                  )}{" "}
                  {busy ||
                    (latest
                      ? "Run browser verification again"
                      : "Run browser verification")}
                </Button>
              )}
            {policy.fixture && m.status === "REVISION_REQUESTED" && (
              <Button
                disabled={!!busy}
                onClick={() =>
                  run(
                    `milestones/${m.id}/agent-revision`,
                    {},
                    "Rechecking corrected delivery…",
                  )
                }
              >
                {busy || "Submit corrected page & recheck"}
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
          {!!screenshots.length && (
            <div className="agent-shots">
              {screenshots.map((index) => (
                <a
                  key={index}
                  href={`/api/agent-runs/${latest!.id}/screenshot/${index}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    alt={`Browser evidence ${index + 1}`}
                    src={`/api/agent-runs/${latest!.id}/screenshot/${index}`}
                    loading="lazy"
                  />
                  <span>Open evidence {index + 1} ↗</span>
                </a>
              ))}
            </div>
          )}
          {!!trace.length && (
            <details className="agent-trace">
              <summary>Tool activity · {trace.length} recorded steps</summary>
              <ol>
                {trace.map((entry, i) => (
                  <li key={i}>
                    <small>
                      {entry.kind.toUpperCase()}
                      {entry.tool ? ` · ${entry.tool}` : ""}
                    </small>
                    <p>{entry.message}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
        <div className="agent-policy">
          <span className="eyebrow">BUYER PAYMENT PERMISSION</span>
          <h3>
            {m.paymentStatus === "CAPTURED"
              ? "Capture completed"
              : active
                ? `Exactly ${money(m.autoCaptureLimit)} · enabled`
                : "Manual approval"}
          </h3>
          <p>
            One {practice ? "simulated" : "PayPal sandbox"} capture for this
            milestone, only after all four browser checks pass with no blocked
            requests. Permission lasts 24 hours.
          </p>
          {active && (
            <p className="fine-print">
              Expires {new Date(m.autoCaptureUntil!).toLocaleString()}.
            </p>
          )}
          {open &&
            (active ? (
              <Button
                variant="outline"
                disabled={!!busy}
                onClick={() =>
                  run(
                    `milestones/${m.id}/agent-policy`,
                    { enabled: false, confirmed: false },
                    "Revoking permission…",
                  )
                }
              >
                Revoke permission
              </Button>
            ) : (
              <>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I authorize one {practice ? "simulated" : "sandbox"} capture
                  of {money(m.amount)} when these checks pass.
                </label>
                <Button
                  variant="outline"
                  disabled={!!busy || !confirmed}
                  onClick={async () => {
                    await run(
                      `milestones/${m.id}/agent-policy`,
                      { enabled: true, confirmed: true },
                      "Saving permission…",
                    );
                    setConfirmed(false);
                  }}
                >
                  Enable for 24 hours
                </Button>
              </>
            ))}
          <small>
            Incomplete checks go to human review. A reachable destination does
            not prove checkout functionality. Sandbox automation also requires a
            live AI planner.
          </small>
        </div>
      </div>
    </section>
  );
}
