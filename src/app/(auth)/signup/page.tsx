"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { PASSWORD_REGEX } from "@/lib/constants";

type ApiFieldError = {
  field: string;
  message: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isPasswordValid = PASSWORD_REGEX.test(password);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company, phone }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(body.error?.message ?? "Unable to create account");
        if (body.error?.fields) {
          const map: Record<string, string> = {};
          body.error.fields.forEach((f: ApiFieldError) => {
            map[f.field] = f.message;
          });
          setFieldErrors(map);
        }
        setLoading(false);
        return;
      }

      // Automatically redirect customer to their portal
      router.push("/my/subscriptions");
      router.refresh();
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Create an account</h1>
        <p className="text-xs text-slate-500">Get started with Brightloop's subscription portal.</p>
      </header>

      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
          {errorMessage}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
          <input
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aditi Sharma"
            required
          />
          {fieldErrors.name && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
          <input
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
          />
          {fieldErrors.email && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
          <input
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••••"
            required
          />
          {fieldErrors.password && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.password}</p>
          )}
        </div>

        {/* Live password criteria checklist */}
        <PasswordChecklist value={password} />

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Company (optional)</label>
            <input
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone (optional)</label>
            <input
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-9 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs mt-2"
          disabled={loading || !isPasswordValid}
        >
          {loading ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Already have an account?{" "}
          <Link className="font-semibold text-indigo-600 hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
