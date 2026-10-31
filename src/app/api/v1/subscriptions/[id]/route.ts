import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionById, updateSubscriptionStatus } from "@/server/catalog";
import { SubscriptionStatus } from "@/lib/schemas";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const subscription = getSubscriptionById(id);
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: subscription });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body as { status: SubscriptionStatus };

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Status field is required" },
        { status: 400 }
      );
    }

    const updated = updateSubscriptionStatus(id, status);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update subscription status" },
      { status: 400 }
    );
  }
}
