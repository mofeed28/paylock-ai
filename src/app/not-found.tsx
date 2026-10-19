import Link from "next/link";
import { accountsEnabled } from "@/lib/workspace";
export default function NotFound() {
  return (
    <div className="page narrow">
      <div className="card empty recovery-card">
        <span className="eyebrow">LET’S GET YOU BACK TO YOUR WORKSPACE</span>
        <h1>This page isn’t available in this session.</h1>
        <p>
          {accountsEnabled() ? (
            "The link may be incorrect, expired, or belong to another account. Sign in with the account that owns this agreement, or ask the buyer for a new seller invitation."
          ) : (
            <>
              The link may be incorrect, or it may belong to an earlier demo
              session. Signing in again starts a new private workspace; it does
              not restore previous agreements.
            </>
          )}
        </p>
        <Link className="button button-primary" href="/agreements">
          Open your current agreements →
        </Link>
        <Link className="text-link" href="/judge">
          Start a fresh guided demo →
        </Link>
      </div>
    </div>
  );
}
