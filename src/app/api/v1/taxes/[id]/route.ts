import { NextRequest, NextResponse } from "next/server";
import { getTaxById, updateTax } from "@/server/catalog";
import { UserRole } from "@/lib/schemas";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tax = getTaxById(id);
    if (!tax) {
      return NextResponse.json(
        { success: false, error: "Tax not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: tax });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tax" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const role = (req.headers.get("x-user-role") || "ADMIN") as UserRole;
    const { id } = await context.params;
    const body = await req.json();
    const updated = updateTax(id, body, role);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    const isForbidden = error.message?.includes("Forbidden");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update tax" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
