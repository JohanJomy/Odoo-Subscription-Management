import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
            LoopLedger
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Subscription Management System
          </span>
        </div>
      </div>

      <section className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {children}
      </section>
    </main>
  );
}
