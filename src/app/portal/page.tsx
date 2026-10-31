"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "invoices" | "account">("subscriptions");
  const [currentSeats, setCurrentSeats] = useState(18);
  const [modalSeats, setModalSeats] = useState(18);
  const baseRatePerSeat = 1361.11;

  // Modals state
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [pauseDuration, setPauseDuration] = useState("30");

  // Payment Verification Simulator state
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPaidVerified, setIsPaidVerified] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOpenSeatModal = () => {
    setModalSeats(currentSeats);
    setIsSeatModalOpen(true);
  };

  const adjustModalSeats = (delta: number) => {
    if (modalSeats + delta >= 5) {
      setModalSeats((prev) => prev + delta);
    } else {
      showToast("Minimum subscription commitment is 5 seats.");
    }
  };

  const handleConfirmSeatUpdate = () => {
    setCurrentSeats(modalSeats);
    setIsSeatModalOpen(false);
    showToast(`License count updated to ${modalSeats} seats. Prorated balance adjusted!`);
  };

  const handleConfirmPause = () => {
    setIsPauseModalOpen(false);
    showToast(`Subscription SUB-0199 pause schedule recorded for ${pauseDuration} days.`);
  };

  const handleCopyVpa = (vpa: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(vpa);
      showToast(`Copied UPI ID "${vpa}" to clipboard!`);
    } else {
      showToast(`UPI ID is: ${vpa}`);
    }
  };

  const handleVerifyPayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsPaidVerified(true);
      showToast("Settlement successful! Invoice INV-2026-0412 marked as PAID.");
    }, 1800);
  };

  const projectedCost = Math.round(modalSeats * baseRatePerSeat);
  const deltaDiff = (modalSeats - 18) * baseRatePerSeat;

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Portal Notice & Client Identification Bar */}
      <div className="pt-2 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
            <span>Apex Logix India Pvt Ltd</span>
            <span>•</span>
            <span>GSTIN: 27AABCA1234F1ZQ</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-secondary font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> verified entity
            </span>
          </div>
          <h1 className="font-headline-xl text-3xl font-extrabold text-on-surface tracking-tight">
            Welcome back, Vikram Mehta
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            LoopLedger Autonomous Billing Cloud · Client Self-Service Workspace
          </p>
        </div>

        {/* Quick Actions Header Cluster */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface text-xs shadow-2xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Account Health: Good Standing</span>
          </div>
          <button
            type="button"
            onClick={() => showToast("Downloading FY26 Tax & Invoices Consolidated Bundle...")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest text-on-surface text-xs shadow-2xs hover:bg-surface-container-high transition-colors font-medium border border-surface-container-high/60"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">download</span>
            <span>GST Tax Bundle</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-container text-on-primary text-xs shadow-2xs hover:bg-primary transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[16px]">support_agent</span>
            <span>Priority Support</span>
          </button>
        </div>
      </div>

      {/* Hero Portal Overview Strip */}
      <div className="py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Highlight Card 1 */}
          <div className="p-4 rounded-xl bg-surface-container-lowest shadow-2xs border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Next Auto-Debit</span>
              <span className="material-symbols-outlined text-primary text-[20px]">event_repeat</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-on-surface">
                ₹30,500<span className="text-xs font-normal text-on-surface-variant">/mo</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Scheduled for <span className="font-semibold text-on-surface">Nov 15, 2026</span>
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-surface-container-low text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">credit_card</span>
              <span>e-Mandate active on HDFC Corp Card ****9102</span>
            </div>
          </div>

          {/* Highlight Card 2 */}
          <div className="p-4 rounded-xl bg-surface-container-lowest shadow-2xs border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Pending Invoice Due</span>
              <span className="material-symbols-outlined text-error text-[20px]">priority_high</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-error">
                {isPaidVerified ? "₹0.00" : "₹24,500"}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                {isPaidVerified ? (
                  <span className="font-semibold text-emerald-600">Settled via UPI</span>
                ) : (
                  <>INV-2026-0412 · Due <span className="font-semibold text-error">Nov 10, 2026</span></>
                )}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-surface-container-low flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant">UPI QR available below</span>
              <a
                href="#payment-section"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                Pay Now <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
              </a>
            </div>
          </div>

          {/* Highlight Card 3 */}
          <div className="p-4 rounded-xl bg-surface-container-lowest shadow-2xs border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Allocated Cloud Seats</span>
              <span className="material-symbols-outlined text-secondary text-[20px]">group</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-on-surface">
                {currentSeats} <span className="text-xs font-normal text-on-surface-variant">/ 25 Capacity</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentSeats / 25) * 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-surface-container-low text-[11px] text-on-surface-variant flex items-center justify-between">
              <span>{Math.max(0, 25 - currentSeats)} unassigned licenses</span>
              <button
                type="button"
                onClick={handleOpenSeatModal}
                className="text-primary font-semibold hover:underline"
              >
                Adjust Seats
              </button>
            </div>
          </div>

          {/* Highlight Card 4 */}
          <div className="p-4 rounded-xl bg-surface-container-low shadow-2xs border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Annual Savings Offer</span>
              <span className="material-symbols-outlined text-secondary-container text-[20px]">
                workspace_premium
              </span>
            </div>
            <div className="mt-2">
              <div className="text-sm font-bold text-on-surface">Save ₹54,900 / yr</div>
              <p className="text-xs text-on-surface-variant mt-1">
                Switch from monthly to annual billing cycle with pre-applied 15% discount.
              </p>
            </div>
            <div className="mt-3 pt-2">
              <button
                type="button"
                onClick={() => showToast("Switched quote generated! RevOps representative alerted.")}
                className="w-full py-1.5 px-2.5 rounded-lg bg-surface-container-lowest text-xs font-semibold text-secondary hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1 shadow-2xs border border-surface-container-high/60"
              >
                <span>Upgrade to Annual Plan</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Segment */}
      <div className="pt-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-container-low w-fit shadow-inner border border-surface-container-high/50">
          <button
            type="button"
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "subscriptions"
                ? "bg-surface-container-lowest text-on-surface shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-primary">autorenew</span>
            <span>My Subscriptions</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-fixed text-on-primary-fixed">
              2
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "invoices"
                ? "bg-surface-container-lowest text-on-surface shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Invoices & Billing History</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-highest text-on-surface-variant">
              6
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "account"
                ? "bg-surface-container-lowest text-on-surface shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">credit_card</span>
            <span>Payment Methods & Mandates</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: SUBSCRIPTIONS */}
      {activeTab === "subscriptions" && (
        <div className="py-4 flex flex-col gap-6 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Active Subscriptions & Self-Service</h2>
              <p className="text-xs text-on-surface-variant">
                Modify seat quotas, suspend billing windows, or lock in annual discounted rates in real time.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-outline font-medium">
              Billing Entity: Apex Logix India (Mumbai Region)
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Primary Core Subscription: SUB-0199 */}
            <div className="lg:col-span-7 rounded-2xl bg-surface-container-lowest p-6 shadow-2xs border border-surface-container-high/60 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-on-surface">
                          Growth SaaS Suite — Monthly
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                          Active
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-primary font-bold">SUB-0199</span>
                        <span>•</span>
                        <span>Recurring Billing Tier 2</span>
                        <span>•</span>
                        <span>Contracted until Nov 2027</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-on-surface">₹24,500</div>
                    <div className="text-[11px] text-on-surface-variant">per month (+ 18% GST)</div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-surface-container-low grid grid-cols-1 sm:grid-cols-3 gap-4 border border-surface-container-high/40">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-outline">Next Cycle Renewal</div>
                    <div className="text-sm font-bold text-on-surface mt-1">Nov 15, 2026</div>
                    <div className="text-[11px] text-on-surface-variant">Auto-charge enabled</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-outline">Licensed Seats</div>
                    <div className="text-sm font-bold text-on-surface mt-1 flex items-center gap-1.5 font-mono">
                      <span>{currentSeats}</span>
                      <span className="text-xs font-normal text-on-surface-variant">Seats Active</span>
                    </div>
                    <div className="text-[11px] text-on-surface-variant">Minimum contract: 5 seats</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-outline">Rate per User</div>
                    <div className="text-sm font-bold text-on-surface mt-1 font-mono">₹1,361.11</div>
                    <div className="text-[11px] text-emerald-600 font-medium">Volume tier applied</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">check</span> 99.9% Uptime SLA
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">check</span> Priority Webhook Dispatch
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">check</span> 5 Custom Role Permissions
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">check</span> Dedicated Success Agent
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-surface-container-high/60">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-outline mb-3">
                  Self-Service Actions
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenSeatModal}
                    className="px-3.5 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>Manage Seats Quota (+/-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPauseModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">pause_circle</span>
                    <span>Pause Subscription (Up to 60d)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast("15% Discount lock applied to your quotation sheet.")}
                    className="px-3.5 py-2 rounded-xl bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold hover:bg-secondary-fixed-dim transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span>Upgrade to Annual (Save 15%)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Add-on Card & Enterprise Scope Card */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-2xs border border-surface-container-high/60 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary-container/10 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-[24px]">api</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">Dedicated API Add-on</h3>
                        <div className="text-xs text-on-surface-variant flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-secondary font-bold">SUB-0240</span>
                          <span>•</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-on-surface">₹6,000</div>
                      <div className="text-[11px] text-on-surface-variant">/ month</div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-surface-container-low text-xs space-y-1.5 border border-surface-container-high/30">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Allocated Rate Limit:</span>
                      <span className="font-semibold text-on-surface">1,000 req / minute</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Webhook Endpoints:</span>
                      <span className="font-semibold text-on-surface">Unlimited</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Next Cycle:</span>
                      <span className="font-semibold text-on-surface">Nov 15, 2026</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-container-high/40">
                  <button
                    type="button"
                    onClick={() => showToast("API Key generation details routed to registered developer email.")}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">key</span>
                    <span>Manage API Keys</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast("Add-on cancellation requested.")}
                    className="text-xs text-outline hover:text-error transition-colors"
                  >
                    Remove Add-on
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-surface-container-low to-surface-container-highest/60 p-5 shadow-2xs border border-surface-container-high/60">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
                  <div>
                    <div className="text-sm font-bold text-on-surface">Need Custom Enterprise Scope?</div>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Have custom compliance, SOC2 NDA documentation, or special PO billing requisites? Reach out directly to your assigned LoopLedger billing partner.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <a
                        href="mailto:billing@loopledger.cloud"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Email Account Partner →
                      </a>
                      <span className="text-outline">•</span>
                      <span className="text-[11px] text-on-surface-variant">SLA: Under 2 Hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: INVOICES & BILLING HISTORY */}
      {activeTab === "invoices" && (
        <div className="py-4 flex flex-col gap-6 animate-in fade-in-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Invoices & Direct Settlement</h2>
              <p className="text-xs text-on-surface-variant">
                View historical GST receipts, download certified PDFs, and make rapid settlements via UPI or NetBanking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => showToast("Downloading last 12 months invoice digest (ZIP)...")}
              className="px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-semibold shadow-2xs hover:bg-surface-container-high transition-colors flex items-center gap-1.5 border border-surface-container-high/60"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">archive</span>
              <span>Download All (FY 2026-27)</span>
            </button>
          </div>

          <div className="rounded-2xl bg-surface-container-lowest shadow-2xs border border-surface-container-high/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider h-11 border-b border-surface-container-high/50 font-semibold">
                    <th className="py-2 px-4">Invoice Number</th>
                    <th className="py-2 px-4">Billing Period</th>
                    <th className="py-2 px-4">Due / Paid Date</th>
                    <th className="py-2 px-4 text-right">Taxable</th>
                    <th className="py-2 px-4 text-right">18% GST</th>
                    <th className="py-2 px-4 text-right">Total Amount</th>
                    <th className="py-2 px-4 text-center">Status</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low text-on-surface">
                  <tr className={`hover:bg-surface-container-low/60 transition-colors ${isPaidVerified ? "" : "bg-amber-50/30"}`}>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-primary font-mono">INV-2026-0412</div>
                      <div className="text-[11px] text-on-surface-variant">Growth SaaS + Dedicated API</div>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant">Oct 15 – Nov 14, 2026</td>
                    <td className="py-3.5 px-4">
                      {isPaidVerified ? (
                        <div className="text-emerald-600 font-semibold">Paid Today</div>
                      ) : (
                        <>
                          <div className="font-semibold text-error">Nov 10, 2026</div>
                          <div className="text-[10px] text-outline">Due in 4 days</div>
                        </>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">₹20,762.71</td>
                    <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">₹3,737.29</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface">₹24,500.00</td>
                    <td className="py-3.5 px-4 text-center">
                      {isPaidVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Paid</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                          <span>Confirmed • Due Soon</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => showToast("Downloading PDF for INV-2026-0412...")}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                          title="Download Invoice PDF"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                        {!isPaidVerified && (
                          <a
                            href="#payment-section"
                            className="px-3 py-1 rounded-lg bg-primary-container text-on-primary text-xs font-semibold shadow-xs hover:bg-primary transition-all flex items-center gap-1"
                          >
                            <span>Pay Now</span>
                            <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-on-surface font-mono">INV-2026-0350</div>
                      <div className="text-[11px] text-on-surface-variant">Growth SaaS Suite</div>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant">Sep 15 – Oct 14, 2026</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-on-surface">Oct 10, 2026</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Paid via UPI</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">₹20,762.71</td>
                    <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">₹3,737.29</td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-on-surface">₹24,500.00</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Paid</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => showToast("Downloading Receipt for INV-2026-0350...")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface text-xs hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">receipt</span>
                        <span>Receipt PDF</span>
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-on-surface font-mono">INV-2026-0280</div>
                      <div className="text-[11px] text-on-surface-variant">Growth SaaS Suite</div>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant">Aug 15 – Sep 14, 2026</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-on-surface">Sep 10, 2026</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Auto-debited</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">₹20,762.71</td>
                    <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">₹3,737.29</td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-on-surface">₹24,500.00</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Paid</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => showToast("Downloading Receipt for INV-2026-0280...")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface text-xs hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">receipt</span>
                        <span>Receipt PDF</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: PAYMENT METHODS & MANDATES */}
      {activeTab === "account" && (
        <div className="py-4 flex flex-col gap-6 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Payment Methods & Auto-Debit Mandates</h2>
              <p className="text-xs text-on-surface-variant">
                Active e-Mandates comply with RBI guidelines for recurring corporate billing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => showToast("Opening card tokenization modal...")}
              className="px-3.5 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold shadow-xs hover:bg-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Corporate Card</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-2xs border border-surface-container-high/60 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center font-bold font-mono text-primary text-xs">
                    HDFC
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-on-surface font-mono">•••• 9102</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        Default Auto-Debit
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5">
                      Corporate Visa Commercial • Exp 08/29
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-emerald-600">verified</span>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container-low flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">e-Mandate Max Limit: ₹1,00,000</span>
                <button
                  type="button"
                  onClick={() => showToast("Mandate limits updated.")}
                  className="text-primary font-semibold hover:underline"
                >
                  Edit Limits
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-2xs border border-surface-container-high/60 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center font-bold font-mono text-secondary text-xs">
                    ICICI
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-on-surface font-mono">•••• 4431</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface-variant">
                        Backup
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5">
                      Corporate Mastercard • Exp 12/28
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast("Set as default card.")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Set as Default
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container-low flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">e-Mandate Max Limit: ₹50,000</span>
                <button
                  type="button"
                  onClick={() => showToast("Card removed.")}
                  className="text-error font-medium hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTEGRATED UPI QR CODE PAYMENT SECTION */}
      <section className="py-4" id="payment-section">
        <div className="rounded-2xl bg-surface-container-lowest p-6 lg:p-8 shadow-sm border border-surface-container-high/60">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                    Direct Payment Gateway
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">Ref: INV-2026-0412</span>
                </div>
                <h2 className="text-2xl font-bold text-on-surface mt-2">
                  Instant UPI & NetBanking Settlement
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Zero transaction surcharge. Powered by NPCI UPI Autonomous Reconciliation Engine.
                </p>

                <div className="mt-6 p-4 rounded-xl bg-surface-container-low space-y-3 border border-surface-container-high/40">
                  <div className="flex justify-between text-xs text-on-surface font-medium">
                    <span>Growth SaaS Suite ({currentSeats} seats • 1 Month)</span>
                    <span className="font-mono">₹20,762.71</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Integrated CGST @ 9%</span>
                    <span className="font-mono">₹1,868.65</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Integrated SGST @ 9%</span>
                    <span className="font-mono">₹1,868.64</span>
                  </div>
                  <div className="pt-3 border-t border-surface-container-high flex justify-between items-baseline">
                    <span className="text-sm text-on-surface font-bold">Total Payable Amount</span>
                    <span className="text-2xl font-mono text-primary font-bold">
                      {isPaidVerified ? "₹0.00 (PAID)" : "₹24,500.00"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-surface-container-high/60 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-emerald-600 mt-0.5">
                    verified_user
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-on-surface">Real-Time Ledger Reconciliation</p>
                    <p className="text-[12px] text-on-surface-variant mt-0.5">
                      Payments are recorded instantaneously and matched to invoice{" "}
                      <span className="font-mono font-bold text-on-surface">INV-2026-0412</span>. Your GST compliance credit memo updates upon transaction success.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-container-low flex flex-wrap items-center gap-3">
                <span className="text-xs text-on-surface-variant">Or alternative payment:</span>
                <button
                  type="button"
                  onClick={() => showToast("Launching Razorpay Corporate Gateway...")}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">credit_card</span>
                  <span>Pay via Card / NetBanking (Razorpay)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyVpa("INV-2026-0412@loopledger")}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs hover:text-on-surface transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  <span>Copy UPI ID</span>
                </button>
              </div>
            </div>

            <div className="w-full lg:w-96 p-6 rounded-2xl bg-surface-container-low flex flex-col items-center text-center shadow-inner border border-surface-container-high/40">
              <div className="text-[11px] uppercase tracking-wider text-outline mb-1 font-bold">
                Scan with any UPI App
              </div>
              <div className="text-sm font-bold text-on-surface">Apex Logix Corporate Portal</div>
              <div className="text-xs font-mono text-primary font-bold mt-0.5">
                UPI ID: INV-2026-0412@loopledger
              </div>

              <div className="relative my-4 p-4 rounded-xl bg-surface-container-lowest shadow-md flex flex-col items-center justify-center">
                <svg className="w-44 h-44 text-on-surface" fill="currentColor" viewBox="0 0 100 100">
                  <rect fill="currentColor" height="24" rx="2" width="24" x="5" y="5"></rect>
                  <rect fill="#FFFFFF" height="16" rx="1" width="16" x="9" y="9"></rect>
                  <rect fill="currentColor" height="8" rx="0.5" width="8" x="13" y="13"></rect>

                  <rect fill="currentColor" height="24" rx="2" width="24" x="71" y="5"></rect>
                  <rect fill="#FFFFFF" height="16" rx="1" width="16" x="75" y="9"></rect>
                  <rect fill="currentColor" height="8" rx="0.5" width="8" x="79" y="13"></rect>

                  <rect fill="currentColor" height="24" rx="2" width="24" x="5" y="71"></rect>
                  <rect fill="#FFFFFF" height="16" rx="1" width="16" x="9" y="75"></rect>
                  <rect fill="currentColor" height="8" rx="0.5" width="8" x="13" y="79"></rect>

                  <rect height="5" width="5" x="33" y="7"></rect>
                  <rect height="6" width="6" x="42" y="7"></rect>
                  <rect height="4" width="4" x="52" y="7"></rect>
                  <rect height="5" width="5" x="60" y="8"></rect>
                  <rect height="5" width="5" x="7" y="34"></rect>
                  <rect height="6" width="6" x="15" y="42"></rect>
                  <rect height="4" width="6" x="23" y="34"></rect>
                  <rect height="5" width="5" x="7" y="50"></rect>
                  <rect height="6" width="4" x="16" y="58"></rect>
                  <rect height="7" width="7" x="34" y="24"></rect>
                  <rect height="5" width="5" x="45" y="22"></rect>
                  <rect height="6" width="6" x="54" y="26"></rect>

                  <rect fill="#4F46E5" height="24" rx="4" width="24" x="38" y="38"></rect>
                  <path
                    d="M46 50 L49 53 L54 46"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  ></path>

                  <rect height="5" width="6" x="66" y="34"></rect>
                  <rect height="6" width="5" x="75" y="42"></rect>
                  <rect height="6" width="6" x="85" y="36"></rect>
                  <rect height="5" width="5" x="33" y="66"></rect>
                  <rect height="6" width="6" x="42" y="68"></rect>
                  <rect height="5" width="4" x="52" y="65"></rect>
                  <rect height="6" width="7" x="66" y="66"></rect>
                  <rect height="5" width="5" x="77" y="74"></rect>
                  <rect height="6" width="6" x="86" y="68"></rect>
                  <rect height="5" width="5" x="74" y="84"></rect>
                  <rect height="6" width="6" x="83" y="82"></rect>
                </svg>
                <div className="mt-2 text-[10px] font-mono font-bold text-outline">
                  {isPaidVerified ? "STATUS: PAID" : "AMOUNT LOCKED: ₹24,500.00"}
                </div>
              </div>

              <div className="w-full">
                <span className="text-[11px] text-on-surface-variant font-medium">Supported UPI Apps:</span>
                <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-[10px] font-bold text-on-surface shadow-xs">
                    GPay
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-[10px] font-bold text-on-surface shadow-xs">
                    PhonePe
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-[10px] font-bold text-on-surface shadow-xs">
                    Paytm
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-[10px] font-bold text-on-surface shadow-xs">
                    BHIM
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-[10px] font-bold text-on-surface shadow-xs">
                    Cred
                  </span>
                </div>
              </div>

              <div className="mt-5 w-full">
                <button
                  type="button"
                  disabled={isVerifying || isPaidVerified}
                  onClick={handleVerifyPayment}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors ${
                    isPaidVerified
                      ? "bg-emerald-700 cursor-default"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                      <span>Verifying with NPCI Gateway...</span>
                    </>
                  ) : isPaidVerified ? (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Payment Verified! Receipt Generated</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">sync</span>
                      <span>I Have Sent Payment • Verify Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Modal 1: Manage Seats */}
      {isSeatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface">Manage Subscription Seats</h3>
              <button
                type="button"
                onClick={() => setIsSeatModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Adjust active licenses for <strong className="text-on-surface">Growth SaaS Suite (SUB-0199)</strong>. Prorated adjustments take effect immediately.
            </p>

            <div className="my-6 p-4 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container-high/50">
              <div>
                <span className="text-[11px] text-outline uppercase font-semibold">Active User Seats</span>
                <div className="text-3xl font-bold font-mono text-on-surface mt-1">{modalSeats}</div>
                <span className="text-[11px] text-on-surface-variant">Min contract: 5 seats</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustModalSeats(-1)}
                  className="w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors font-bold text-xl flex items-center justify-center shadow-xs"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustModalSeats(1)}
                  className="w-10 h-10 rounded-xl bg-primary-container text-on-primary hover:bg-primary transition-colors font-bold text-xl flex items-center justify-center shadow-xs"
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-container text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="font-sans font-medium text-on-surface-variant">New Monthly Run-Rate:</span>
                <span className="font-bold text-on-surface">₹{projectedCost.toLocaleString("en-IN")} / mo</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span className="font-sans">Prorated Delta Today:</span>
                <span className={deltaDiff > 0 ? "font-semibold text-amber-600" : deltaDiff < 0 ? "font-semibold text-emerald-600" : ""}>
                  {deltaDiff > 0
                    ? `+₹${Math.round(deltaDiff).toLocaleString("en-IN")}`
                    : deltaDiff < 0
                    ? `-₹${Math.round(Math.abs(deltaDiff)).toLocaleString("en-IN")} (Credited)`
                    : "₹0.00"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSeatModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSeatUpdate}
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors"
              >
                Confirm Seat Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal 2: Pause Subscription */}
      {isPauseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">pause_circle</span>
                <h3 className="text-base font-bold text-on-surface">Pause Subscription</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPauseModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              You can temporarily pause billing for <strong className="text-on-surface">SUB-0199</strong> for up to 60 days. Your data, workspace instances, and settings will remain completely intact.
            </p>
            <div className="mt-4">
              <label className="text-[11px] text-outline uppercase font-semibold block mb-1">
                Select Pause Duration
              </label>
              <select
                value={pauseDuration}
                onChange={(e) => setPauseDuration(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border-0 text-on-surface text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="15">15 Days (Resume Dec 1, 2026)</option>
                <option value="30">30 Days (Resume Dec 15, 2026)</option>
                <option value="45">45 Days (Resume Dec 30, 2026)</option>
                <option value="60">60 Days (Resume Jan 15, 2027 • Max Allowable)</option>
              </select>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-surface-container-low text-[11px] text-on-surface-variant space-y-0.5">
              <p>• Auto-renewal is halted for the selected window.</p>
              <p>• Users can login in read-only mode during the pause period.</p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPauseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold"
              >
                Nevermind
              </button>
              <button
                type="button"
                onClick={handleConfirmPause}
                className="px-4 py-2 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-secondary-container transition-colors"
              >
                Confirm Pause Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal 3: Priority Support */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">contact_support</span>
                <h3 className="text-base font-bold text-on-surface">Client Support Desk</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              Direct channel to your assigned billing coordinator at LoopLedger RevOps.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] text-outline uppercase font-semibold block mb-1">
                  Subject / Area
                </label>
                <select className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-xs">
                  <option>Invoice Clarification (INV-2026-0412)</option>
                  <option>GST Credit Note or Input Tax Requisite</option>
                  <option>Upgrade to Multi-Year Enterprise Agreement</option>
                  <option>Bank Remittance Confirmation</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-outline uppercase font-semibold block mb-1">
                  Message
                </label>
                <textarea
                  className="w-full p-2 rounded-lg bg-surface-container-low text-on-surface text-xs"
                  placeholder="Describe your query..."
                  rows={3}
                ></textarea>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast("Support ticket #SUP-9921 lodged! Dispatch in < 15 mins.");
                  setIsSupportModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors"
              >
                Send Priority Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Micro Interaction Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-inverse-surface text-inverse-on-surface shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-5">
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
