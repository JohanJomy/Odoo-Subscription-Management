"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const [role, setRole] = useState<"ADMIN" | "STAFF">("ADMIN");

  useEffect(() => {
    const saved = localStorage.getItem("loopledger_user_role") as "ADMIN" | "STAFF";
    if (saved) setRole(saved);
  }, []);

  const handleRoleChange = (newRole: "ADMIN" | "STAFF") => {
    setRole(newRole);
    localStorage.setItem("loopledger_user_role", newRole);
    window.dispatchEvent(new Event("roleChanged"));
  };

  const navLinks = [
    { name: "Products", href: "/catalog/products" },
    { name: "Plans", href: "/catalog/plans" },
    { name: "Templates", href: "/catalog/templates" },
    { name: "Taxes", href: "/pricing/taxes" },
    { name: "Discounts", href: "/pricing/discounts" },
    { name: "Subscriptions", href: "/subscriptions" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/catalog/products" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              LL
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-neutral-100">
                Loop<span className="text-blue-600 dark:text-blue-400">Ledger</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Catalog & Subscriptions
              </span>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right tools: New Subscription & Role toggle */}
        <div className="flex items-center gap-3">
          <Link
            href="/subscriptions/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition"
          >
            <span>+</span>
            <span>New Subscription</span>
          </Link>

          {/* Role switcher */}
          <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg p-0.5 bg-neutral-100 dark:bg-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => handleRoleChange("ADMIN")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                role === "ADMIN"
                  ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("STAFF")}
              className={`px-2 py-1 rounded-md font-medium transition ${
                role === "STAFF"
                  ? "bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              Staff
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
