"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<"ADMIN" | "STAFF" | "PORTAL">("ADMIN");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("loopledger_user_role") as "ADMIN" | "STAFF" | "PORTAL";
    if (saved) setRole(saved);
  }, []);

  const handleRoleChange = (newRole: "ADMIN" | "STAFF" | "PORTAL") => {
    setRole(newRole);
    localStorage.setItem("loopledger_user_role", newRole);
    window.dispatchEvent(new Event("roleChanged"));
  };

  interface NavItem {
    name: string;
    href: string;
    icon: string;
    exact?: boolean;
  }

  interface NavGroup {
    group: string;
    items: NavItem[];
  }

  const navItems: NavGroup[] = [
    {
      group: "Overview",
      items: [
        { name: "Portal & Radar", href: "/", icon: "monitoring", exact: true },
      ],
    },
    {
      group: "Core Operations",
      items: [
        { name: "Subscriptions", href: "/subscriptions", icon: "autorenew" },
        { name: "New Subscription", href: "/subscriptions/new", icon: "add_circle" },
      ],
    },
    {
      group: "Product & Catalog",
      items: [
        { name: "Products & Variants", href: "/catalog/products", icon: "inventory_2" },
        { name: "Plans", href: "/catalog/plans", icon: "layers" },
        { name: "Templates", href: "/catalog/templates", icon: "description" },
      ],
    },
    {
      group: "Pricing & Settings",
      items: [
        { name: "Taxes", href: "/pricing/taxes", icon: "percent" },
        { name: "Discounts", href: "/pricing/discounts", icon: "loyalty" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex">
      {/* Fixed Left Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-surface-container-high/60">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between bg-surface-container-lowest border-b border-surface-container-high/40">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm shadow-xs">
              LL
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-base text-on-surface tracking-tight leading-none font-bold">
                LoopLedger
              </span>
              <span className="text-[11px] text-on-surface-variant leading-none mt-0.5">
                Billing Cloud
              </span>
            </div>
          </Link>
        </div>

        {/* Live Workspace Badge */}
        <div className="px-4 py-2 border-b border-surface-container-high/30">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs">
            <span className="truncate max-w-[130px] font-medium text-on-surface">
              Brightloop Production
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <nav className="flex flex-col gap-1">
            {navItems.map((group) => (
              <div key={group.group} className="mb-2">
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-outline">
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary-container text-on-primary font-semibold shadow-xs"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Synced Card */}
        <div className="p-3 bg-surface-container-lowest border-t border-surface-container-high/40">
          <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-2">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online · Synced
              </span>
              <span className="material-symbols-outlined text-[14px] text-outline">
                cloud_done
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 text-on-surface">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-[10px] font-semibold">
                  AL
                </div>
                <span className="text-xs font-medium truncate max-w-[120px]">
                  Apex Logix HQ
                </span>
              </div>
              <Link
                href="/"
                className="text-primary hover:text-secondary text-[11px] flex items-center gap-0.5 font-medium"
                title="Open Client Portal"
              >
                <span className="material-symbols-outlined text-[14px]">
                  open_in_new
                </span>
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container with Top Header */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-16 w-full px-6 flex items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex items-center gap-4 flex-1 max-w-lg">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subscriptions, products, plans, invoices..."
                  className="w-full h-9 pl-9 pr-14 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline text-xs focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container transition-all"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant text-[10px] font-mono">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </div>
            </div>

            {/* Right Tools: Status, Role switcher, Notifications, User Profile */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-xs text-on-surface">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-[11px]">Online · Synced</span>
              </div>

              {/* Role switcher */}
              <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => handleRoleChange("ADMIN")}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    role === "ADMIN"
                      ? "bg-surface-container-lowest text-primary font-bold shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange("STAFF")}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    role === "STAFF"
                      ? "bg-surface-container-lowest text-amber-600 font-bold shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Staff
                </button>
                <Link
                  href="/"
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition ${
                    role === "PORTAL"
                      ? "bg-surface-container-lowest text-secondary font-bold shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  onClick={() => handleRoleChange("PORTAL")}
                >
                  <span>Portal</span>
                  <span className="material-symbols-outlined text-[12px]">
                    arrow_outward
                  </span>
                </Link>
              </div>

              {/* Notification icon */}
              <button
                type="button"
                aria-label="Notifications"
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  notifications
                </span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-surface-container-lowest"></span>
              </button>

              {/* Profile Pill */}
              <div className="flex items-center gap-2 pl-1 border-l border-surface-container-high/60">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-on-surface leading-tight">
                    Alex Mercer
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">
                    RevOps Admin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 bg-surface">{children}</main>
      </div>
    </div>
  );
}

export default SidebarLayout;
