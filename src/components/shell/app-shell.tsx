"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Repeat,
  Receipt,
  CreditCard,
  Package,
  Layers,
  FileText,
  Tag,
  PlayCircle,
  UserCheck,
  ShieldAlert,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  Sparkles,
  CloudCheck,
  Building2,
  ExternalLink,
  BarChart3,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/constants";
import { getFilteredNavGroups, NavItem } from "./menu";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Inbox,
  Users,
  Repeat,
  Receipt,
  CreditCard,
  Package,
  Layers,
  FileText,
  Tag,
  PlayCircle,
  UserCheck,
  ShieldAlert,
  BarChart3,
  ScanLine,
};

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navGroups = getFilteredNavGroups(user.role);
  const isCustomer = user.role === "CUSTOMER";

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard;
    const isActive =
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href));

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors relative mb-0.5",
          isActive
            ? "bg-indigo-50 text-indigo-700 font-semibold shadow-2xs"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-600 rounded-r-md" />
        )}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
          )}
        />
        <span className="truncate">{item.title}</span>
        {item.badge && (
          <span className="ml-auto rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#FAF8FF]">
      {/* Desktop Persistent Left Sidebar (240px wide) */}
      {!isCustomer && (
        <aside className="hidden lg:flex w-60 flex-col border-r border-slate-200 bg-white shrink-0 sticky top-0 h-screen overflow-y-auto z-40">
          {/* Brand & Tenant Header */}
          <div className="flex flex-col justify-center h-16 border-b border-slate-200 px-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-sm leading-tight">
                    LoopLedger
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Billing Cloud
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                v2.4
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-medium truncate">
                Brightloop Production · Live
              </span>
            </div>
          </div>

          {/* Grouped Navigation Links */}
          <div className="flex-1 px-3 py-3 space-y-4">
            {navGroups.map((group) => (
              <div key={group.group}>
                <div className="px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.group}
                </div>
                <div>{group.items.map(renderNavItem)}</div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer with Sync & Tenant Info */}
          <div className="border-t border-slate-200 p-3 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                <CloudCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Online · Synced</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">PWA Active</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-semibold text-slate-900 leading-tight">
                    {user.name}
                  </p>
                  <span className="inline-block text-[10px] font-medium text-slate-500 capitalize">
                    {user.role.toLowerCase()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Log out"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar (64px high) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {!isCustomer && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {isCustomer ? (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                    LoopLedger Customer Portal
                  </h1>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    Self-service subscriptions, license controls, and tax invoices
                  </p>
                </div>
                <nav className="hidden md:flex ml-6 space-x-2">
                  <Link
                    href="/my/subscriptions"
                    className={cn(
                      "text-xs font-medium px-3 py-1.5 rounded-md transition",
                      pathname.startsWith("/my/subscriptions")
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    My Subscriptions
                  </Link>
                  <Link
                    href="/my/invoices"
                    className={cn(
                      "text-xs font-medium px-3 py-1.5 rounded-md transition",
                      pathname.startsWith("/my/invoices")
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    My Invoices & Receipts
                  </Link>
                </nav>
              </div>
            ) : (
              <div className="hidden sm:flex items-center relative w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subscriptions, invoices, customers..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-14 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <span className="absolute right-2.5 top-2 rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500">
                  ⌘K
                </span>
              </div>
            )}
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-3">
            {/* Live Synced indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Online · Synced</span>
            </div>

            {/* Quick role switcher pills */}
            <div className="hidden lg:flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px]">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition",
                  user.role === "ADMIN"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500"
                )}
              >
                Admin
              </span>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition",
                  user.role === "STAFF"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500"
                )}
              >
                Staff
              </span>
              <Link
                href="/my/subscriptions"
                className="px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-900 flex items-center gap-1"
                title="Open customer portal"
              >
                Portal
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {!isCustomer && (
              <Link
                href="/inbox"
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition"
                title="Renewals & Dunning Alerts"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </Link>
            )}

            {/* User profile dropdown / trigger */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-xs shadow-2xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-500 capitalize">
                  {user.role.toLowerCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main
          className={cn(
            "flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-12",
            isCustomer ? "max-w-5xl mx-auto w-full" : "max-w-[1400px] mx-auto w-full"
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile Drawer (for Admin/Staff on Phones) */}
      {!isCustomer && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                  LL
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-sm">LoopLedger</span>
                  <span className="block text-[10px] text-slate-400">Billing Cloud v2.4</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              {navGroups.map((group) => (
                <div key={group.group}>
                  <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 uppercase">
                    {group.group}
                  </div>
                  <div>{group.items.map(renderNavItem)}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar for Mobile Phone Screens (< 768px) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-slate-200 bg-white lg:hidden px-2 shadow-lg">
        {isCustomer ? (
          <>
            <Link
              href="/my/subscriptions"
              className={cn(
                "flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded",
                pathname.startsWith("/my/subscriptions")
                  ? "text-indigo-600 font-semibold"
                  : "text-slate-500"
              )}
            >
              <Repeat className="h-5 w-5" />
              <span>Subscriptions</span>
            </Link>
            <Link
              href="/my/invoices"
              className={cn(
                "flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded",
                pathname.startsWith("/my/invoices")
                  ? "text-indigo-600 font-semibold"
                  : "text-slate-500"
              )}
            >
              <Receipt className="h-5 w-5" />
              <span>Invoices</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/dashboard"
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium py-1",
                pathname === "/dashboard"
                  ? "text-indigo-600 font-semibold"
                  : "text-slate-500"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Radar</span>
            </Link>
            <Link
              href="/subscriptions"
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium py-1",
                pathname.startsWith("/subscriptions")
                  ? "text-indigo-600 font-semibold"
                  : "text-slate-500"
              )}
            >
              <Repeat className="h-4 w-4" />
              <span>Subs</span>
            </Link>
            <Link
              href="/invoices"
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium py-1",
                pathname.startsWith("/invoices")
                  ? "text-indigo-600 font-semibold"
                  : "text-slate-500"
              )}
            >
              <Receipt className="h-4 w-4" />
              <span>Invoices</span>
            </Link>
            <Link
              href="/payments"
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium py-1",
                pathname.startsWith("/payments")
                  ? "text-indigo-600 font-semibold"
                  : "text-slate-500"
              )}
            >
              <CreditCard className="h-4 w-4" />
              <span>Payments</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-slate-500 py-1"
            >
              <Menu className="h-4 w-4" />
              <span>More</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
