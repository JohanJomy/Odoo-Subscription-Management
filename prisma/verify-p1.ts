import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { formatMoney, paiseToRupees, rupeesToPaise } from "../src/lib/money";
import { PASSWORD_REGEX } from "../src/lib/constants";
import { generatePasswordResetToken, hashResetToken } from "../src/server/auth/password-reset";
import { scopeToCustomer } from "../src/server/auth/guard";
import { createSessionToken, verifySessionToken } from "../src/server/auth/session";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 Running Verification for P1 Platform & Security");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Password regex checks
  console.log("1. Password Regex Validation (Acceptance Test #2):");
  assert(!PASSWORD_REGEX.test("Abcdefg!"), "Rejects 8-char password ('Abcdefg!')");
  assert(!PASSWORD_REGEX.test("abcdefgh1!"), "Rejects missing uppercase ('abcdefgh1!')");
  assert(!PASSWORD_REGEX.test("ABCDEFGH1!"), "Rejects missing lowercase ('ABCDEFGH1!')");
  assert(!PASSWORD_REGEX.test("Abcdefghi1"), "Rejects missing special character ('Abcdefghi1')");
  assert(PASSWORD_REGEX.test("Abcdefgh1!"), "Accepts valid password ('Abcdefgh1!')");
  assert(PASSWORD_REGEX.test("Passw0rd!x"), "Accepts seed password ('Passw0rd!x')");

  // 2. Money utility checks
  console.log("\n2. Money & Paise Formatting Rules:");
  assert(formatMoney(12345600).includes("1,23,456.00"), "formatMoney(12345600) formats as ₹1,23,456.00");
  assert(formatMoney(56000).includes("560.00"), "formatMoney(56000) formats variant surcharge as ₹560.00");
  assert(paiseToRupees(99900) === 999.00, "paiseToRupees(99900) === 999.00");
  assert(rupeesToPaise(560.00) === 56000, "rupeesToPaise(560.00) === 56000");

  // 3. JWT Session creation and verification
  console.log("\n3. JWT & Session Security:");
  const token = await createSessionToken({
    sub: "test-user-123",
    role: "ADMIN",
    customerId: null,
  });
  assert(typeof token === "string" && token.length > 20, "JWT token created successfully");
  const verified = await verifySessionToken(token);
  assert(verified !== null && verified.sub === "test-user-123" && verified.role === "ADMIN", "JWT verified and payload matched");

  // 4. Customer Isolation Helper (Acceptance Test #5):
  console.log("\n4. Customer Data Isolation (Multi-Tenancy Guard):");
  const adminScope = scopeToCustomer({ role: "ADMIN", customerId: null });
  assert(Object.keys(adminScope).length === 0, "Admin sees unrestricted queries (empty customerId filter)");

  const customerScope = scopeToCustomer({ role: "CUSTOMER", customerId: "cust_123" });
  assert((customerScope as any).customerId === "cust_123", "Customer automatically scoped to customerId 'cust_123'");

  // 5. Password Reset Single-Use & Expiry (Acceptance Test #3):
  console.log("\n5. Password Reset Token System (Acceptance Test #3):");
  const { token: rawToken, tokenHash, expiresAt } = generatePasswordResetToken();
  assert(rawToken.length === 64, "Raw reset token has 64 hex characters (32 bytes entropy)");
  assert(hashResetToken(rawToken) === tokenHash, "SHA-256 hash matches correctly");
  assert(expiresAt.getTime() > Date.now() + 29 * 60 * 1000, "Token expiry is 30 minutes in the future");

  // 6. Database Verification
  console.log("\n6. Database & Seed Verification:");
  const admin = await prisma.user.findUnique({ where: { email: "admin@loopledger.test" } });
  assert(admin !== null && admin.role === "ADMIN" && admin.active, "Admin user exists and is active");

  const validPw = await bcrypt.compare("Passw0rd!x", admin?.passwordHash ?? "");
  assert(validPw, "Admin password hashes and verifies with bcrypt");

  const customerCount = await prisma.customer.count();
  assert(customerCount >= 50, `At least 50 customers seeded (${customerCount} found)`);

  const subscriptionCount = await prisma.subscription.count();
  assert(subscriptionCount >= 200, `At least 200 subscriptions seeded (${subscriptionCount} found)`);

  const activeSubscriptions = await prisma.subscription.count({ where: { status: "ACTIVE" } });
  assert(activeSubscriptions >= 60, `At least 60 active subscriptions seeded (${activeSubscriptions} found)`);

  const invoiceCount = await prisma.invoice.count();
  assert(invoiceCount >= 300, `At least 300 invoices seeded (${invoiceCount} found)`);

  const paymentCount = await prisma.payment.count();
  assert(paymentCount >= 200, `At least 200 payments seeded (${paymentCount} found)`);

  const odooVariant = await prisma.productVariant.findFirst({
    where: { attribute: "Brand", value: "Odoo" },
  });
  assert(odooVariant !== null && odooVariant.extraPrice === 56000, "Odoo variant created with +₹560.00 (56,000 paise)");

  const taxes = await prisma.tax.findMany();
  assert(taxes.length >= 2, `GST taxes created (${taxes.length} found)`);

  const discounts = await prisma.discount.findMany();
  assert(discounts.length >= 3, `Discounts created (${discounts.length} found)`);

  console.log("\n==================================================");
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

