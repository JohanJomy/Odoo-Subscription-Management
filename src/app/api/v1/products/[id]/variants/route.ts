import { NextRequest, NextResponse } from "next/server";
import { addVariant } from "@/server/catalog";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const product = addVariant(id, body);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add variant" },
      { status: 400 }
    );
  }
}
