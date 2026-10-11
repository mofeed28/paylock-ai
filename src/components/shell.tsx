"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  LockKeyhole,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const seller = path.startsWith("/seller");
  const links = [
    { href: "/", label: "Workspace", icon: LayoutDashboard },
    { href: "/agreements", label: "Agreements", icon: FolderOpen },
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
            <strong>Paylock workspace</strong>
            <small>{seller ? "Seller portal" : "Buyer workspace"}</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <span className="nav-caption">WORKSPACE</span>
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
        <span className="nav-caption">BUILD & EXPLORE</span>
        <nav>
          <Link
            href="/demo"
            className={`nav-link ${path === "/demo" ? "active" : ""}`}
          >
            <FlaskConical size={18} />
            Walkthrough
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
            <strong>Your judgment. AI assistance.</strong>
            <p>Every release starts with a human decision.</p>
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
              <strong>{seller ? "Seller access" : "Buyer access"}</strong>
              <small>
                {seller ? "Secure submission link" : "Workspace owner"}
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
                ? "Seller portal"
                : path === "/"
                  ? "Overview"
                  : path.startsWith("/agreements/new")
                    ? "New agreement"
                    : path.startsWith("/agreements")
                      ? "Agreements"
                      : path === "/ledger"
                        ? "Payment ledger"
                        : path === "/demo"
                          ? "Demo studio"
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
