import { buyerPage } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await buyerPage();
  return children;
}
