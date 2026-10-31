import { NextRequest, NextResponse } from "next/server";
import { getPlanById, updatePlan } from "@/server/catalog";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const plan = getPlanById(id);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch plan" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const updated = updatePlan(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update plan" },
      { status: 400 }
    );
  }
}
