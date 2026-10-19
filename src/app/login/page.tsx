import { LoginPage } from "@/components/login-page";
import { accountsEnabled } from "@/lib/workspace";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext =
    next?.startsWith("/seller/") &&
    /^\/seller\/[a-f0-9]{64}(\?milestone=[a-zA-Z0-9_-]+)?$/.test(next)
      ? next
      : "/agreements";
  return <LoginPage accounts={accountsEnabled()} next={safeNext} />;
}
