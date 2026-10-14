import { judgeDemo } from "@/lib/workspace";
import { AgreementForm } from "@/components/agreement-form";
import { paymentMode } from "@/lib/paypal";
export default function Page() {
  return <AgreementForm mode={paymentMode()} judgeDemo={judgeDemo()} />;
}
