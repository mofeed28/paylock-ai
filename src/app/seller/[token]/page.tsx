import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { agreementInclude, jsonData } from "@/lib/data";
import { SellerPortal } from "@/components/seller-portal";
import { judgeDemo } from "@/lib/workspace";
import { buyerPage } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const token = (await params).token;
  if (token.length !== 64) notFound();
  const a = await db.agreement.findUnique({
    where: { sellerToken: token },
    include: agreementInclude,
  });
  if (!a) notFound();
  if (judgeDemo() && a.workspaceId !== (await buyerPage())) notFound();
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
  return <SellerPortal agreement={jsonData(safe)} judgeDemo={judgeDemo()} />;
}
