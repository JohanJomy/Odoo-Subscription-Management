import { NextRequest, NextResponse } from "next/server";
import { executePlanAction } from "@/server/catalog";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const result = executePlanAction(id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute plan action" },
      { status: 400 }
    );
  }
}
