import Link from "next/link";
import { ReceiptText, Download } from "lucide-react";
import { db } from "@/lib/db";
import { money, date } from "@/lib/utils";
import { buyerPage } from "@/lib/auth";
export default async function Page() {
  const workspaceId = await buyerPage();
  const events = await db.paymentEvent.findMany({
    where: { agreement: { workspaceId } },
    include: { agreement: true, milestone: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE MONEY TRAIL</div>
          <h1>Payment ledger</h1>
          <p>Every order, authorization, and capture. Connected to the work.</p>
        </div>
        <span className="subtle-pill">{events.length} recorded events</span>
      </div>
      <section className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>EVENT / DATE</th>
                <th>AGREEMENT / MILESTONE</th>
                <th>PROVIDER</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>REFERENCE</th>
                <th>EXPORT</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.type}</strong>
                    <small>{date(e.createdAt)}</small>
                  </td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/agreements/${e.agreementId}`}
                    >
                      {e.agreement.title}
                    </Link>
                    <small>{e.milestone?.title}</small>
                  </td>
                  <td>
                    <span className="subtle-pill">{e.provider}</span>
                  </td>
                  <td className="amount">{money(e.amount)}</td>
                  <td>{e.status}</td>
                  <td className="mono reference-cell">
                    {e.providerCaptureId ||
                      e.providerAuthorizationId ||
                      e.providerOrderId ||
                      "—"}
                  </td>
                  <td>
                    <a
                      href={`/api/agreements/${e.agreementId}/export`}
                      aria-label={`Export ${e.agreement.title}`}
                    >
                      <Download size={17} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!events.length && (
          <div className="empty">
            <ReceiptText size={30} />
            <h3>No payments recorded yet</h3>
            <p>Authorize a milestone to start its payment history.</p>
            <Link href="/demo" className="text-link">
              Explore the demo →
            </Link>
          </div>
        )}
      </section>
      <p className="fine-print">
        Orders and authorizations do not represent completed payments. Practice
        events are simulations. Only completed captures count as released
        amounts.
      </p>
    </div>
  );
}
