import QrScanner from "@/components/p4/qr-scanner";
import { requireRole } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  await requireRole(["ADMIN", "STAFF"]);
  return <div className="max-w-2xl space-y-6"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment QR Scanner</h1><p className="mt-1 text-xs text-slate-500">Scan a customer-provided UPI QR or paste its payload for verification.</p></div><QrScanner /></div>;
}
