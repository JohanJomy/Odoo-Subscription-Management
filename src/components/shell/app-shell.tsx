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
  Tag,
  PlayCircle,
  UserCheck,
  ShieldAlert,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/constants";
import { getMenuItemsForRole, NavItem } from "./menu";

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
  Tag,
  PlayCircle,
  UserCheck,
  ShieldAlert,
};

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Catalog: true,
    Pricing: true,
  });
  const [loggingOut, setLoggingOut] = useState(false);

  const { main, admin } = getMenuItemsForRole(user.role);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

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
    const hasChildren = item.children && item.children.length > 0;
    const isActive =
      pathname === item.href ||
      (hasChildren && item.children?.some((c) => pathname.startsWith(c.href)));

    if (hasChildren) {
      const isExpanded = expandedGroups[item.title] ?? false;
      return (
        <div key={item.title} className="mb-1">
          <button
            type="button"
            onClick={() => toggleGroup(item.title)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.title}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {isExpanded && (
            <div className="ml-8 mt-1 space-y-1 border-l border-slate-200 pl-2">
              {item.children?.map((child) => {
                const isChildActive = pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      isChildActive
                        ? "bg-indigo-50 text-indigo-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    {child.title}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative mb-1",
          isActive
            ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-600 rounded-r-md" />
        )}
        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-600" : "text-slate-400")} />
        <span>{item.title}</span>
        {item.badge && (
          <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const isCustomer = user.role === "CUSTOMER";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar (Only for Staff & Admin) */}
      {!isCustomer && (
        <aside className="hidden lg:flex w-60 flex-col border-r border-slate-200 bg-white shrink-0 sticky top-0 h-screen overflow-y-auto">
          {/* Logo Brand */}
          <div className="flex h-14 items-center gap-3 border-b border-slate-200 px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 leading-tight">LoopLedger</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                Subscription Cloud
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-3 py-4">
            <div className="mb-2 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Platform
            </div>
            {main.map(renderNavItem)}

            {admin.length > 0 && (
              <>
                <div className="my-3 border-t border-slate-200 pt-3">
                  <div className="mb-2 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Administration
                  </div>
                  {admin.map(renderNavItem)}
                </div>
              </>
            )}
          </div>

          {/* User footer on sidebar */}
          <div className="border-t border-slate-200 p-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-medium text-slate-900">{user.name}</p>
                  <span className="inline-block rounded bg-indigo-100/70 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-800">
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Log out"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {!isCustomer && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {isCustomer && (
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  LoopLedger Portal
                </span>
                <nav className="hidden sm:flex ml-6 space-x-4">
                  <Link
                    href="/my/subscriptions"
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded transition",
                      pathname.startsWith("/my/subscriptions")
                        ? "text-indigo-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    My Subscriptions
                  </Link>
                  <Link
                    href="/my/invoices"
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded transition",
                      pathname.startsWith("/my/invoices")
                        ? "text-indigo-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    My Invoices
                  </Link>
                </nav>
              </div>
            )}

            {!isCustomer && (
              <div className="hidden sm:flex items-center relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick search... (Ctrl+K)"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isCustomer && (
              <Link
                href="/inbox"
                className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 transition"
                title="Dunning & Renewal Inbox"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
              </Link>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-900 leading-tight">{user.name}</span>
                <span className="text-[10px] text-slate-400 capitalize">{user.role.toLowerCase()}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                className="ml-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main
          className={cn(
            "flex-1 p-4 sm:p-6 pb-20 lg:pb-8",
            isCustomer ? "max-w-5xl mx-auto w-full" : "max-w-7xl mx-auto w-full"
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay (for Staff/Admin) */}
      {!isCustomer && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-600 text-white font-bold text-xs">
                  LL
                </div>
                <span className="font-semibold text-slate-900">LoopLedger</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {main.map(renderNavItem)}
              {admin.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <div className="mb-2 px-2 text-[10px] font-semibold text-slate-400 uppercase">
                    Admin
                  </div>
                  {admin.map(renderNavItem)}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
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
                pathname.startsWith("/my/subscriptions") ? "text-indigo-600 font-semibold" : "text-slate-500"
              )}
            >
              <Repeat className="h-5 w-5" />
              <span>Subscriptions</span>
            </Link>
            <Link
              href="/my/invoices"
              className={cn(
                "flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded",
                pathname.startsWith("/my/invoices") ? "text-indigo-600 font-semibold" : "text-slate-500"
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
                pathname === "/dashboard" ? "text-indigo-600 font-semibold" : "text-slate-500"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/subscriptions"
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium py-1",
                pathname.startsWith("/subscriptions") ? "text-indigo-600 font-semibold" : "text-slate-500"
              )}
            >
              <Repeat className="h-4 w-4" />
              <span>Subs</span>
            </Link>
            <Link
              href="/invoices"
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium py-1",
                pathname.startsWith("/invoices") ? "text-indigo-600 font-semibold" : "text-slate-500"
              )}
            >
              <Receipt className="h-4 w-4" />
              <span>Invoices</span>
            </Link>
            <Link
              href="/payments"
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium py-1",
                pathname.startsWith("/payments") ? "text-indigo-600 font-semibold" : "text-slate-500"
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
