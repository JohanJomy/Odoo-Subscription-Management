import { NextRequest, NextResponse } from "next/server";
import { calculateSubscriptionPrice } from "@/server/catalog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = calculateSubscriptionPrice(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate subscription price" },
      { status: 400 }
    );
  }
}
