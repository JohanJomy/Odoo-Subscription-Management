import { NextRequest, NextResponse } from "next/server";
import { updateVariant, deleteVariant } from "@/server/catalog";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await context.params;
    const body = await req.json();
    const product = updateVariant(id, variantId, body);
    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update variant" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await context.params;
    const result = deleteVariant(id, variantId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Cannot delete variant" },
      { status: 400 }
    );
  }
}
