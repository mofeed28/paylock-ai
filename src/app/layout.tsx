import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";
import { accountsEnabled, judgeDemo } from "@/lib/workspace";
export const metadata: Metadata = {
  title: "Paylock AI — Work agreed. Payment earned.",
  description:
    "Evidence-based milestone agreements, AI-assisted review, and buyer-controlled PayPal sandbox payments.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell judgeDemo={judgeDemo()} accounts={accountsEnabled()}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
