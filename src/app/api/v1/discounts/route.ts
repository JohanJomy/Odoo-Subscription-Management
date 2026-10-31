import { NextRequest, NextResponse } from "next/server";
import { listDiscounts, createDiscount } from "@/server/catalog";
import { UserRole } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const target = (searchParams.get("target") as "PRODUCT" | "SUBSCRIPTION") || undefined;

    const discounts = listDiscounts({ search, activeOnly, target });
    return NextResponse.json({ success: true, data: discounts });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "ADMIN") as UserRole;
    const body = await req.json();
    const discount = createDiscount(body, role);
    return NextResponse.json({ success: true, data: discount }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.includes("Forbidden");
    return NextResponse.json(
      { success: false, error: error.message || "Invalid discount data" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
