import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "Paylock AI — Work agreed. Payment earned.",
  description:
    "Evidence-based milestone agreements, AI-assisted review, and buyer-controlled PayPal sandbox payments.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
