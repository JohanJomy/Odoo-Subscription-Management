import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Passw0rd!x";

async function main() {
  console.log("🌱 Starting LoopLedger comprehensive database seed...");

  // Clear existing data in reverse dependency order to ensure idempotency
  await prisma.billingRun.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.templateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // 1. Taxes
  console.log("Creating taxes...");
  const tax18 = await prisma.tax.create({
    data: {
      name: "GST 18%",
      ratePercent: 18.0,
      active: true,
    },
  });

  const tax5 = await prisma.tax.create({
    data: {
      name: "GST 5%",
      ratePercent: 5.0,
      active: true,
    },
  });

  // 2. Products with Variants
  console.log("Creating products and variants...");
  const crmProduct = await prisma.product.create({
    data: {
      name: "Enterprise CRM Suite",
      type: "SOFTWARE",
      salesPrice: 250000, // ₹2,500.00
      costPrice: 120000,  // ₹1,200.00
      notes: "Cloud-hosted multi-tenant CRM engine",
      active: true,
      variants: {
        create: [
          { attribute: "Brand", value: "Odoo", extraPrice: 56000 }, // +₹560.00
          { attribute: "Brand", value: "SAP", extraPrice: 90000 },  // +₹900.00
          { attribute: "Brand", value: "Zoho", extraPrice: 0 },     // +₹0.00
        ],
      },
    },
    include: { variants: true },
  });

  const billingAddon = await prisma.product.create({
    data: {
      name: "Automated Invoicing & E-Way Bill",
      type: "ADDON",
      salesPrice: 80000, // ₹800.00
      costPrice: 30000,
      notes: "GST portal connector and e-way bill automation",
      active: true,
    },
  });

  const supportProduct = await prisma.product.create({
    data: {
      name: "24/7 Dedicated Support",
      type: "SERVICE",
      salesPrice: 150000, // ₹1,500.00
      costPrice: 90000,
      notes: "SLA backed response under 15 minutes",
      active: true,
    },
  });

  const backupAddon = await prisma.product.create({
    data: {
      name: "Daily Cloud Backup Vault",
      type: "ADDON",
      salesPrice: 50000, // ₹500.00
      costPrice: 20000,
      notes: "Encrypted offsite snapshot backups with instant restore",
      active: true,
    },
  });

  const analyticsProduct = await prisma.product.create({
    data: {
      name: "Revenue Radar Analytics",
      type: "SOFTWARE",
      salesPrice: 120000, // ₹1,200.00
      costPrice: 50000,
      notes: "Cohort churn analysis and MRR projections",
      active: true,
    },
  });

  const productsList = [crmProduct, billingAddon, supportProduct, backupAddon, analyticsProduct];

  // 3. Plans
  console.log("Creating plans...");
  const monthlyPlan = await prisma.plan.create({
    data: {
      name: "Standard Monthly Growth",
      price: 99900, // ₹999.00
      billingPeriod: "MONTHLY",
      minQty: 1,
      startDate: new Date("2026-01-01"),
      autoClose: false,
      closable: true,
      pausable: true,
      renewable: true,
      active: true,
    },
  });

  const yearlyPlan = await prisma.plan.create({
    data: {
      name: "Annual Scale Pro",
      price: 999900, // ₹9,999.00
      billingPeriod: "YEARLY",
      minQty: 1,
      startDate: new Date("2026-01-01"),
      autoClose: false,
      closable: true,
      pausable: false,
      renewable: true,
      active: true,
    },
  });

  const weeklyPlan = await prisma.plan.create({
    data: {
      name: "Weekly Sprint Pilot",
      price: 39900, // ₹399.00
      billingPeriod: "WEEKLY",
      minQty: 2,
      startDate: new Date("2026-01-01"),
      autoClose: true,
      endDate: new Date("2026-12-31"),
      closable: true,
      pausable: true,
      renewable: true,
      active: true,
    },
  });

  const dailyPlan = await prisma.plan.create({
    data: {
      name: "Daily High-Frequency Fleet",
      price: 9900, // ₹99.00
      billingPeriod: "DAILY",
      minQty: 5,
      startDate: new Date("2026-01-01"),
      autoClose: true,
      endDate: new Date("2026-11-30"),
      closable: true,
      pausable: false,
      renewable: false,
      active: true,
    },
  });

  const plansList = [monthlyPlan, yearlyPlan, weeklyPlan, dailyPlan];

  // 4. Quotation Templates
  console.log("Creating quotation templates...");
  const template1 = await prisma.quotationTemplate.create({
    data: {
      name: "Starter SME Pack",
      validityDays: 15,
      planId: monthlyPlan.id,
      lines: {
        create: [
          {
            productId: crmProduct.id,
            variantId: crmProduct.variants[0].id, // Odoo variant
            qty: 1,
          },
          {
            productId: billingAddon.id,
            qty: 1,
          },
        ],
      },
    },
  });

  const template2 = await prisma.quotationTemplate.create({
    data: {
      name: "Enterprise Annual Transformation",
      validityDays: 30,
      planId: yearlyPlan.id,
      lines: {
        create: [
          {
            productId: crmProduct.id,
            variantId: crmProduct.variants[1].id, // SAP variant
            qty: 5,
          },
          {
            productId: supportProduct.id,
            qty: 1,
          },
          {
            productId: backupAddon.id,
            qty: 2,
          },
        ],
      },
    },
  });

  // 5. Discounts
  console.log("Creating discounts...");
  const discount10Percent = await prisma.discount.create({
    data: {
      name: "High Volume 10% Off",
      type: "PERCENT",
      percent: 10,
      minPurchase: 100000, // ₹1,000.00
      minQty: 5,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      usageLimit: 50,
      usedCount: 4,
      appliesTo: "SUBSCRIPTION",
      active: true,
    },
  });

  const discountFixed500 = await prisma.discount.create({
    data: {
      name: "Festive ₹500 Voucher",
      type: "FIXED",
      fixedAmount: 50000, // ₹500.00
      minPurchase: 200000, // ₹2,000.00
      minQty: 1,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      usageLimit: 100,
      usedCount: 12,
      appliesTo: "SUBSCRIPTION",
      active: true,
    },
  });

  const expiredDiscount = await prisma.discount.create({
    data: {
      name: "Early Bird Pilot (Expired)",
      type: "PERCENT",
      percent: 25,
      minPurchase: 50000,
      minQty: 1,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-02-01"),
      usageLimit: 20,
      usedCount: 20,
      appliesTo: "SUBSCRIPTION",
      active: false,
    },
  });

  // 6. Users: 1 Admin, 2 Staff
  console.log("Creating admin and staff accounts...");
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@loopledger.test",
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  const staffUser1 = await prisma.user.create({
    data: {
      email: "staff@loopledger.test",
      passwordHash,
      role: "STAFF",
      active: true,
    },
  });

  const staffUser2 = await prisma.user.create({
    data: {
      email: "staff2@loopledger.test",
      passwordHash,
      role: "STAFF",
      active: true,
    },
  });

  // 7. Customers (50 total, 3 with user logins)
  console.log("Creating 50 customers...");
  const customerRows = [];
  const indianCompanies = [
    "AeroTech Solutions Pvt Ltd", "Bharat Logistics LLP", "Chakra FinServ", "Deccan Retail Hub",
    "Ekta Agro Exports", "FastTrack Couriers", "Ganga Pharma Corp", "Himachal Breweries",
    "Indus Engineering Works", "Jaipur Handicrafts", "Kaveri Software Systems", "Lotus Diagnostics",
    "Mayura Textiles Ltd", "Navrang Media Studios", "Omega Steel & Power", "Pragati Cold Storage",
    "Quantum Cloud Labs", "Rhythm Audio Systems", "Surya Solar Energy", "Trident Marine Agency",
    "Utsav Hospitality Group", "Varun Beverages Dist.", "Western Auto Ancillaries", "Zenith Health Tech",
    "Apex Global Logistics", "BlueStar Cold Chain", "Crown Jewelers Mumbai", "Delta Electronics",
    "Everest Chemical Industries", "Falcon Security Force", "Greenleaf Organics", "Horizon Infra Projects",
    "Imperial Tea Gardens", "Jupiter Metals Ltd", "Kalyani Packaging", "Liberty Garments",
    "Metro Supermarkets", "Northern Grid Power", "Orbit Space Communications", "Pioneer Seed Genetics",
    "Reliance Allied Warehousing", "Shree Cement Traders", "Titan Paper Mills", "Universal Freightways",
    "Vanguard Safety Equipments", "Wave Broadband", "Xcel Marine Logistics", "Yamuna Power Solutions",
    "Zephyr Environmental", "Brightloop Dynamics"
  ];

  for (let i = 0; i < 50; i++) {
    const isLoginAccount = i < 3;
    const email = isLoginAccount ? `customer${i + 1}@loopledger.test` : `customer${i + 1}@sampleco.in`;
    const companyName = indianCompanies[i] ?? `Enterprise ${i + 1} Pvt Ltd`;
    const contactName = `Contact Person ${i + 1}`;

    const customer = await prisma.customer.create({
      data: {
        name: contactName,
        company: companyName,
        phone: `+91 98${(10000000 + i * 1357).toString().slice(0, 8)}`,
        address: `${101 + i}, Tech Hub Tower, Outer Ring Road, Bengaluru, Karnataka 560103`,
        gstin: `29AAACP${(1000 + i)}K1Z${(i % 9) + 1}`,
        ...(isLoginAccount
          ? {
              user: {
                create: {
                  email,
                  passwordHash,
                  role: "CUSTOMER",
                  active: true,
                },
              },
            }
          : {}),
      },
      include: { user: true },
    });
    customerRows.push(customer);
  }

  // 8. Subscriptions (200 subscriptions)
  console.log("Creating 200 subscriptions across mixed statuses...");
  const now = new Date("2026-10-31T06:00:00Z");
  const subscriptions = [];

  const statuses: ("DRAFT" | "QUOTATION" | "CONFIRMED" | "ACTIVE" | "CLOSED")[] = [
    "DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "ACTIVE", "ACTIVE", "CLOSED"
  ];
  const paymentTerms = ["IMMEDIATE", "NET15", "NET30"];

  for (let i = 1; i <= 200; i++) {
    const customer = customerRows[(i - 1) % customerRows.length];
    const plan = plansList[(i - 1) % plansList.length];
    const status = statuses[(i - 1) % statuses.length];
    const term = paymentTerms[(i - 1) % paymentTerms.length];
    const subNumber = `SUB-${String(i).padStart(4, "0")}`;

    // Calculate dates
    const startDate = new Date(now.getTime() - ((i % 60) * 24 * 60 * 60 * 1000));
    const expiryDate = new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000));

    // ACTIVE subscriptions have nextInvoiceDate spread over past 30 days so billing has due subscriptions
    let nextInvoiceDate: Date | null = null;
    let closeReason: string | null = null;

    if (status === "ACTIVE") {
      // 60 active with nextInvoiceDate due today or past month
      const daysOffset = (i % 30) - 15; // some past due, some today, some future
      nextInvoiceDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    } else if (status === "CLOSED") {
      closeReason = i % 2 === 0 ? "EXPIRED" : "PAUSED";
    }

    const sub = await prisma.subscription.create({
      data: {
        number: subNumber,
        customerId: customer.id,
        planId: plan.id,
        startDate,
        expiryDate,
        paymentTerm: term,
        status,
        closeReason,
        nextInvoiceDate,
        quoteValidUntil: status === "QUOTATION" ? new Date(now.getTime() + 15 * 86400000) : null,
        lines: {
          create: [
            {
              productId: crmProduct.id,
              variantId: crmProduct.variants[i % 3].id,
              description: `Enterprise CRM Suite (Brand: ${crmProduct.variants[i % 3].value})`,
              qty: Math.max(plan.minQty, (i % 5) + 1),
              unitPrice: crmProduct.salesPrice + crmProduct.variants[i % 3].extraPrice,
              taxId: tax18.id,
              amount: (crmProduct.salesPrice + crmProduct.variants[i % 3].extraPrice) * Math.max(plan.minQty, (i % 5) + 1),
            },
            {
              productId: billingAddon.id,
              description: billingAddon.name,
              qty: 1,
              unitPrice: billingAddon.salesPrice,
              taxId: tax18.id,
              amount: billingAddon.salesPrice,
            },
          ],
        },
      },
    });
    subscriptions.push(sub);
  }

  // 9. Invoices (300) and Payments (200)
  console.log("Creating 300 invoices and 200 payments...");
  const invoiceStatuses: ("PAID" | "CONFIRMED" | "DRAFT")[] = ["PAID", "PAID", "CONFIRMED", "CONFIRMED", "DRAFT"];

  for (let i = 1; i <= 300; i++) {
    const sub = subscriptions[(i - 1) % subscriptions.length];
    const invNumber = `INV-2026-${String(i).padStart(4, "0")}`;

    // Period dates
    const periodStart = new Date(now.getTime() - ((i % 90) * 86400000));
    const periodEnd = new Date(periodStart.getTime() + (30 * 86400000));

    // Spread due dates: some overdue by 1-30 days, 31-60 days, 60+ days
    let dueDate: Date;
    if (i % 4 === 0) {
      dueDate = new Date(now.getTime() - (45 * 86400000)); // 31-60 days overdue
    } else if (i % 5 === 0) {
      dueDate = new Date(now.getTime() - (75 * 86400000)); // 61+ days overdue
    } else if (i % 3 === 0) {
      dueDate = new Date(now.getTime() - (15 * 86400000)); // 1-30 days overdue
    } else {
      dueDate = new Date(now.getTime() + (15 * 86400000)); // Future due
    }

    const subtotal = 386000; // ~₹3,860.00
    const discountTotal = i % 3 === 0 ? 38600 : 0;
    const taxTotal = Math.round((subtotal - discountTotal) * 0.18);
    const total = subtotal - discountTotal + taxTotal;

    // Set status and paidTotal so exactly 200 invoices have payments (140 full, 60 partial)
    let status: "PAID" | "CONFIRMED" | "DRAFT";
    let paidTotal = 0;

    if (i <= 140) {
      status = "PAID";
      paidTotal = total;
    } else if (i <= 200) {
      status = "CONFIRMED";
      paidTotal = Math.round(total / 2);
    } else if (i <= 260) {
      status = "CONFIRMED";
      paidTotal = 0;
    } else {
      status = "DRAFT";
      paidTotal = 0;
    }

    const invoice = await prisma.invoice.create({
      data: {
        number: invNumber,
        subscriptionId: sub.id,
        customerId: sub.customerId,
        periodStart,
        periodEnd,
        status,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        paidTotal,
        dueDate,
        sentAt: status !== "DRAFT" ? periodStart : null,
        lines: {
          create: [
            {
              description: "Enterprise CRM Suite (Monthly License)",
              qty: 1,
              unitPrice: subtotal,
              discountAmount: discountTotal,
              taxAmount: taxTotal,
              amount: subtotal - discountTotal,
            },
          ],
        },
      },
    });

    // Create payments for PAID and partially paid invoices
    if (paidTotal > 0 && i <= 200) {
      const paymentMethods = ["UPI", "BANK", "CARD", "CASH"];
      const method = paymentMethods[i % paymentMethods.length];
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          method,
          amount: paidTotal,
          paidOn: new Date(dueDate.getTime() - (2 * 86400000)),
          note: `Payment recorded via ${method} for ${invoice.number}`,
          recordedById: adminUser.id,
        },
      });
    }
  }

  // 10. Audit log entries
  console.log("Writing initial audit logs...");
  await prisma.auditLog.createMany({
    data: [
      {
        entity: "System",
        entityId: "INIT",
        action: "DATABASE_INITIALIZED",
        userId: adminUser.id,
        detail: "Standard system seed completed",
      },
      {
        entity: "Tax",
        entityId: tax18.id,
        action: "TAX_CREATED",
        userId: adminUser.id,
        detail: "GST 18% tax rule created",
      },
    ],
  });

  console.log("\n========================================================");
  console.log("🎉 LoopLedger Seed Successfully Finished!");
  console.log("========================================================");
  console.log("🔑 Default Test Accounts (Password: Passw0rd!x):");
  console.log("  • Admin:     admin@loopledger.test");
  console.log("  • Staff:     staff@loopledger.test");
  console.log("  • Staff 2:   staff2@loopledger.test");
  console.log("  • Customer:  customer1@loopledger.test");
  console.log("  • Customer:  customer2@loopledger.test");
  console.log("  • Customer:  customer3@loopledger.test");
  console.log("--------------------------------------------------------");
  console.log(`📌 DEFAULT_TAX_ID: ${tax18.id}`);
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
