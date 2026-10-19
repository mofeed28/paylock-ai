import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { agreementInclude, jsonData } from "@/lib/data";
import { SellerPortal } from "@/components/seller-portal";
import { accountsEnabled, judgeDemo } from "@/lib/workspace";
import { buyerPage, currentAccount } from "@/lib/auth";
import { SellerInvitation } from "@/components/seller-access";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ milestone?: string }>;
}) {
  const token = (await params).token;
  const milestone = (await searchParams).milestone;
  const account = await currentAccount();
  if (accountsEnabled() && !account)
    redirect(
      `/login?next=${encodeURIComponent(`/seller/${token}${milestone && /^[a-zA-Z0-9_-]+$/.test(milestone) ? `?milestone=${milestone}` : ""}`)}`,
    );
  if (token.length !== 64) notFound();
  const a = await db.agreement.findUnique({
    where: { sellerToken: token },
    include: agreementInclude,
  });
  if (!a) notFound();
  if (judgeDemo() && a.workspaceId !== (await buyerPage())) notFound();
  const ownerPreview = !!account && a.workspaceId === `account:${account.id}`;
  if (accountsEnabled() && !ownerPreview && a.sellerUserId !== account?.id) {
    if (
      !a.workspaceId.startsWith("account:") ||
      !a.sellerInviteExpiresAt ||
      a.sellerInviteExpiresAt <= new Date()
    )
      notFound();
    return (
      <SellerInvitation
        token={token}
        userId={account!.id}
        status={a.accessRequests.find((r) => r.userId === account!.id)?.status}
      />
    );
  }
  const safe = {
    id: a.id,
    title: a.title,
    description: a.description,
    sellerEmail: a.sellerEmail,
    sellerToken: a.sellerToken,
    paymentMode: a.paymentMode,
    milestones: a.milestones,
    timeline: a.timeline
      .filter((t) =>
        ["REVISE", "DISPUTE", "REOPEN", "RELEASED"].includes(t.type),
      )
      .map((t) => ({ id: t.id, message: t.message, createdAt: t.createdAt })),
  };
  return (
    <SellerPortal
      agreement={jsonData(safe)}
      judgeDemo={judgeDemo()}
      ownerPreview={ownerPreview}
      accounts={accountsEnabled()}
      initialMilestone={(await searchParams).milestone}
    />
  );
}
