"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { PASSWORD_REGEX } from "@/lib/constants";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPasswordValid = PASSWORD_REGEX.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setErrorMessage("Reset token is missing from URL.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(body.error?.message ?? "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Password Reset Complete</h2>
        <p className="text-xs text-slate-500">
          Your password has been securely updated. You can now log in with your new credentials.
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            Sign in now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Set new password</h1>
        <p className="text-xs text-slate-500">Choose a secure password for your account.</p>
      </header>

      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
          {errorMessage}
        </div>
      )}

      {!token && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          No reset token was found in the URL. Please verify the link from your email.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
          <input
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••••"
            required
          />
        </div>

        {/* Live password requirements checklist */}
        <PasswordChecklist value={password} />

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
          <input
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="•••••••••"
            required
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-[11px] text-rose-600">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          className="h-9 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs mt-2"
          disabled={loading || !token || !isPasswordValid || !passwordsMatch}
        >
          {loading ? "Updating password..." : "Update password"}
        </Button>
      </form>

      <div className="text-center pt-2">
        <Link className="text-xs text-indigo-600 hover:underline font-medium" href="/login">
          Back to log in
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-xs text-slate-400">
          Loading reset details...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
