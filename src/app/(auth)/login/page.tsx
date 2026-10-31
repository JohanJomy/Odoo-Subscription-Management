"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(body.error?.message ?? "Invalid email or password");
        setLoading(false);
        return;
      }

      const role = body.data?.role;
      const destination = role === "CUSTOMER" ? "/my/subscriptions" : "/dashboard";

      router.push(destination);
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect to server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="text-xs text-slate-500">Sign in to your LoopLedger workspace.</p>
      </header>

      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
          {errorMessage}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
          <input
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@loopledger.test"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">Password</label>
            <Link
              className="text-[11px] font-medium text-indigo-600 hover:underline"
              href="/forgot"
            >
              Forgot password?
            </Link>
          </div>
          <input
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••••"
            required
          />
        </div>

        <Button
          type="submit"
          className="h-9 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs mt-1"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Log in"}
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link className="font-semibold text-indigo-600 hover:underline" href="/signup">
            Sign up
          </Link>
        </p>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700 block mb-0.5">Demo accounts:</span>
        Admin: <code className="text-slate-800">admin@loopledger.test</code> / <code className="text-slate-800">Passw0rd!x</code>
      </div>
    </div>
  );
}
