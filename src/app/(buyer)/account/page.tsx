import { currentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AccountControls } from "@/components/account-controls";
import { CopyButton } from "@/components/common";
import { SellerPayPal } from "@/components/seller-paypal";
import { sellerPayPalStatus } from "@/lib/seller-paypal";
export default async function Page() {
  const user = await currentAccount();
  if (!user) redirect("/login");
  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <h1>Your account</h1>
          <p>
            {user.name} · {user.email}
          </p>
        </div>
      </div>
      <section className="card form-card">
        <h2>Your invitation identity</h2>
        <p>
          Share your Paylock email and account ID directly with your buyer. They
          invite this account, then you accept in your seller inbox.
        </p>
        <p>Account ID: {user.id}</p>
        <CopyButton value={user.id} label="Copy account ID" />
        <p>
          Your agreements and receipts remain available when you sign back in.
          Signing out does not delete work.
        </p>
        <AccountControls />
        <p className="fine-print">
          Email verification and password-reset emails are not configured. Keep
          your password safe; an email address alone does not prove account
          ownership.
        </p>
      </section>
      <SellerPayPal connection={await sellerPayPalStatus(user.id)} />
    </div>
  );
}
