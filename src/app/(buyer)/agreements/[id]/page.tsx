import { judgeDemo } from "@/lib/workspace";
import { notFound } from "next/navigation";
import { getAgreement, jsonData } from "@/lib/data";
import { AgreementDetail } from "@/components/agreement-detail";
import { paypalConfigured } from "@/lib/paypal";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ milestone?: string }>;
}) {
  const a = await getAgreement((await params).id);
  if (!a) notFound();
  return (
    <AgreementDetail
      agreement={jsonData(a)}
      judgeDemo={judgeDemo()}
      initialMilestone={(await searchParams).milestone}
      paypalClientId={
        paypalConfigured() ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "" : ""
      }
    />
  );
}
