import { accountsEnabled, judgeDemo } from "@/lib/workspace";
import { notFound } from "next/navigation";
import { getAgreement, jsonData } from "@/lib/data";
import { AgreementDetail } from "@/components/agreement-detail";
import { paypalConfigured } from "@/lib/paypal";
import { platformConfigured } from "@/lib/paypal-platform";
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
      accounts={accountsEnabled()}
      initialMilestone={(await searchParams).milestone}
      paypalClientId={
        a.paymentRouting === "seller"
          ? platformConfigured()
            ? process.env.PAYPAL_PLATFORM_CLIENT_ID || ""
            : ""
          : paypalConfigured()
            ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ""
            : ""
      }
      paypalPartnerCode={
        a.paymentRouting === "seller"
          ? process.env.PAYPAL_PARTNER_BN_CODE
          : undefined
      }
    />
  );
}
