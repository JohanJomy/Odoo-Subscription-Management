"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setErrorMessage(body.error?.message ?? "Unable to process request");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Forgot password</h1>
        <p className="text-xs text-slate-500">
          Enter your registered email and we&apos;ll send you a single-use password reset link.
        </p>
      </header>

      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
          {errorMessage}
        </div>
      )}

      {submitted ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2 text-center">
          <MailCheck className="h-8 w-8 text-emerald-600 mx-auto" />
          <h2 className="text-sm font-semibold text-emerald-900">Check your email</h2>
          <p className="text-xs text-emerald-700">
            If an active account exists for <strong>{email}</strong>, a reset link valid for 30 minutes has been dispatched.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block text-xs font-semibold text-indigo-600 hover:underline"
            >
              Return to log in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
            <input
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <Button
            type="submit"
            className="h-9 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs"
            disabled={loading}
          >
            {loading ? "Sending reset link..." : "Send reset link"}
          </Button>

          <div className="text-center pt-2">
            <Link className="text-xs text-indigo-600 hover:underline font-medium" href="/login">
              Back to log in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
