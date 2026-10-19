import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentAccount();
  if (!user) redirect("/login");
  const agreements = await db.agreement.findMany({
    where: { sellerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      buyerName: true,
      sellerToken: true,
      milestones: {
        orderBy: { position: "asc" },
        select: { id: true, status: true },
      },
    },
  });
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SELLER WORKSPACE</span>
          <h1>Work you’re delivering.</h1>
          <p>
            Agreements where the buyer has approved your account. Your own buyer
            agreements are separate.
          </p>
        </div>
        <Link className="text-link" href="/agreements">
          Your buyer agreements →
        </Link>
      </div>
      {!agreements.length && (
        <div className="card form-card">
          <h2>No seller agreements yet.</h2>
          <p>
            Ask your buyer for their invitation link. Request access and share
            your account ID with them so they can approve you.
          </p>
          <p>Account ID: {user.id}</p>
        </div>
      )}
      {agreements.map((a) => (
        <Link
          className="card form-card"
          key={a.id}
          href={`/seller/${a.sellerToken}?milestone=${a.milestones.find((m) => m.status !== "RELEASED")?.id || a.milestones[0]?.id || ""}`}
        >
          <h2>{a.title}</h2>
          <p>Buyer: {a.buyerName}</p>
          <span className="text-link">Open delivery workspace →</span>
        </Link>
      ))}
    </div>
  );
}
