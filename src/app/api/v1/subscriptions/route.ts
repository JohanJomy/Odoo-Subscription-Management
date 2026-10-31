import { NextRequest, NextResponse } from "next/server";
import { listSubscriptions, createSubscription } from "@/server/catalog";
import { SubscriptionStatus } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as SubscriptionStatus) || undefined;
    const customerId = searchParams.get("customerId") || undefined;

    const subscriptions = listSubscriptions({ search, status, customerId });
    return NextResponse.json({ success: true, data: subscriptions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subscription = createSubscription(body);
    return NextResponse.json({ success: true, data: subscription }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Invalid subscription data" },
      { status: 400 }
    );
  }
}
