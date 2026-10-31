import { NextRequest, NextResponse } from "next/server";
import { listTaxes, createTax } from "@/server/catalog";
import { UserRole } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const taxes = listTaxes({ search, activeOnly });
    return NextResponse.json({ success: true, data: taxes });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch taxes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "ADMIN") as UserRole;
    const body = await req.json();
    const tax = createTax(body, role);
    return NextResponse.json({ success: true, data: tax }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.includes("Forbidden");
    return NextResponse.json(
      { success: false, error: error.message || "Invalid tax data" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
