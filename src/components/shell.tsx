"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  FolderOpen,
  ScanEye,
  LockKeyhole,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
export function Shell({
  children,
  judgeDemo = false,
}: {
  children: React.ReactNode;
  judgeDemo?: boolean;
}) {
  const path = usePathname();
  const seller = path.startsWith("/seller");
  const links = [
    { href: "/agreements", label: "Your agreements", icon: FolderOpen },
    { href: "/ledger", label: "Payment ledger", icon: ReceiptText },
  ];
  if (path === "/login") return <>{children}</>;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <LockKeyhole size={21} />
          </span>
          paylock<span className="brand-ai">AI</span>
        </Link>
        <div className="workspace">
          <span className="workspace-avatar">P</span>
          <div>
            <strong>{seller ? "Seller view" : "Buyer view"}</strong>
            <small>
              {seller
                ? judgeDemo
                  ? "Testing the seller’s side"
                  : "Submit work for review"
                : judgeDemo
                  ? "Your private test session"
                  : "Buyer workspace"}
            </small>
          </div>
          <span className="workspace-dot" />
        </div>
        {judgeDemo && (
          <Link className="nav-link" href="/judge">
            Judge demo guide
          </Link>
        )}
        <span className="nav-caption">
          {seller ? "BUYER WORKSPACE" : "YOUR WORKSPACE"}
        </span>
        <nav>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${(href === "/" ? path === href : path.startsWith(href)) ? "active" : ""}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <span className="nav-caption">DEMO & TOOLS</span>
        <nav>
          <Link
            href="/agent"
            className={`nav-link ${path === "/agent" ? "active" : ""}`}
          >
            <ScanEye size={18} />
            Browser walkthrough
          </Link>
          <Link
            href="/demo"
            className={`nav-link ${path === "/demo" ? "active" : ""}`}
          >
            <FlaskConical size={18} />
            Text walkthrough
          </Link>
          <Link
            href="/settings"
            className={`nav-link ${path === "/settings" ? "active" : ""}`}
          >
            <Settings2 size={18} />
            Integrations
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-note">
            <ShieldCheck size={19} />
            <strong>
              {seller
                ? "Show the work you delivered."
                : "Your requirements. Your decision."}
            </strong>
            <p>
              {seller
                ? "The buyer sets the requirements. Submit evidence for review."
                : "Set the requirements, review evidence, and approve payment."}
            </p>
            <Link href="/demo">
              Explore the workflow <ArrowUpRight size={13} />
            </Link>
          </div>
          <a
            className="nav-link"
            href="https://paypalaihackathon.devpost.com/"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={17} />
            Hackathon brief
            <ArrowUpRight size={14} />
          </a>
          <div className="profile">
            <span className="avatar">{seller ? "JS" : "AM"}</span>
            <div>
              <strong>{seller ? "Seller view" : "Buyer view"}</strong>
              <small>
                {seller ? "Submit evidence" : "Set requirements & review work"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>
              {seller
                ? judgeDemo
                  ? "Testing the seller’s side"
                  : "Submit work for review"
                : path === "/"
                  ? "Overview"
                  : path.startsWith("/agreements/new")
                    ? "New agreement"
                    : path.startsWith("/agreements")
                      ? "Agreements"
                      : path === "/ledger"
                        ? "Payment ledger"
                        : path === "/agent"
                          ? "Browser walkthrough"
                          : path === "/demo"
                            ? "Demo studio"
                            : path === "/judge"
                              ? "Judge demo"
                              : "Integrations"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="system-status">
              <span />
              Sandbox workspace
            </span>
            <span className="topbar-divider" />
            <Sparkles size={15} />
            <span>Evidence before payment</span>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <span>
            <LockKeyhole size={12} /> Paylock AI · Hackathon MVP
          </span>
          <span>Sandbox only · No real-money escrow</span>
        </footer>
      </div>
    </div>
  );
}
