import { accountsEnabled, judgeDemo } from "@/lib/workspace";
import { AgreementForm } from "@/components/agreement-form";
import { paymentMode } from "@/lib/paypal";
import { connectedDemoSeller } from "@/lib/auth";
export default async function Page() {
  return (
    <AgreementForm
      mode={paymentMode()}
      judgeDemo={judgeDemo()}
      accounts={accountsEnabled()}
      demoSeller={await connectedDemoSeller()}
    />
  );
}
