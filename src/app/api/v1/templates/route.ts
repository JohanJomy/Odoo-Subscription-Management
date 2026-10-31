import { NextRequest, NextResponse } from "next/server";
import { listTemplates, createTemplate } from "@/server/catalog";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const templates = listTemplates({ search, activeOnly });
    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const template = createTemplate(body);
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Invalid template data" },
      { status: 400 }
    );
  }
}
