"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronDown,
  FolderOpen,
  Inbox,
  LockKeyhole,
  ReceiptText,
  Settings2,
  ScanEye,
  FlaskConical,
} from "lucide-react";

export function Shell({
  children,
  judgeDemo = false,
  accounts = false,
}: {
  children: React.ReactNode;
  judgeDemo?: boolean;
  accounts?: boolean;
}) {
  const path = usePathname();
  const seller = path.startsWith("/seller");
  if (path === "/login") return <>{children}</>;
  const title = seller
    ? "Selling"
    : path.startsWith("/agreements")
      ? "Buying"
      : path === "/ledger"
        ? "Payments"
        : path === "/account"
          ? "Account"
          : path === "/agent"
            ? "Browser demo"
            : path === "/demo"
              ? "Text demo"
              : path === "/judge"
                ? "Demo guide"
                : path === "/settings"
                  ? "Integrations"
                  : "Workspace";
  const links = [
    {
      href: "/agreements",
      label: accounts ? "Buying" : "Agreements",
      icon: FolderOpen,
      active: path.startsWith("/agreements"),
    },
    ...(accounts
      ? [{ href: "/seller", label: "Selling", icon: Inbox, active: seller }]
      : []),
    {
      href: "/ledger",
      label: "Payments",
      icon: ReceiptText,
      active: path === "/ledger",
    },
  ];
  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <LockKeyhole size={20} />
          </span>
          paylock<span className="brand-ai">AI</span>
        </Link>
        <nav className="workspace-nav" aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={active ? "selected" : ""}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <details
          className="workspace-tools"
          open={
            judgeDemo ||
            ["/agent", "/demo", "/settings", "/judge"].includes(path)
          }
        >
          <summary>
            Explore the demo <ChevronDown size={15} />
          </summary>
          <nav aria-label="Demo tools">
            {judgeDemo && <Link href="/judge">Judge guide</Link>}
            <Link
              href="/agent"
              aria-current={path === "/agent" ? "page" : undefined}
            >
              <ScanEye size={16} />
              Browser demo
            </Link>
            <Link
              href="/demo"
              aria-current={path === "/demo" ? "page" : undefined}
            >
              <FlaskConical size={16} />
              Text demo
            </Link>
            <Link
              href="/settings"
              aria-current={path === "/settings" ? "page" : undefined}
            >
              <Settings2 size={16} />
              Integrations
            </Link>
            <a
              href="https://paypalaihackathon.devpost.com/"
              target="_blank"
              rel="noreferrer"
            >
              Hackathon brief
              <ArrowUpRight size={14} />
            </a>
          </nav>
        </details>
        {accounts && (
          <Link
            href="/account"
            className={`workspace-account ${path === "/account" ? "selected" : ""}`}
            aria-current={path === "/account" ? "page" : undefined}
          >
            <Settings2 size={18} />
            <span>Account & sign out</span>
          </Link>
        )}
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <span>{title}</span>
          <span className="sandbox-label">
            <i />
            Sandbox · Test payments
          </span>
        </header>
        <main>{children}</main>
        <footer>
          <span>Paylock AI</span>
          <span>Sandbox only · No real-money escrow</span>
        </footer>
      </div>
    </div>
  );
}
