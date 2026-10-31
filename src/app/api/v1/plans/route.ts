import { NextRequest, NextResponse } from "next/server";
import { listPlans, createPlan } from "@/server/catalog";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const plans = listPlans({ search, activeOnly });
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = createPlan(body);
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Invalid plan data" },
      { status: 400 }
    );
  }
}
