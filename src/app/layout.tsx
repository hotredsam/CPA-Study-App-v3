import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPA Study Servant",
  description: "AI-powered CPA exam coach.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
