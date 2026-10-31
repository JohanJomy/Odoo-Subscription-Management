import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoopLedger | Subscription & Invoicing Platform",
  description: "Enterprise subscription management, billing engine, and invoicing platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-slate-900">
        {children}
      </body>
    </html>
  );
}
