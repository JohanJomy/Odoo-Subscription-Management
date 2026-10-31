import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/http";
import { clearSessionCookie } from "@/server/auth/session";

export const POST = apiHandler(async () => {
  const response = NextResponse.json({
    data: { message: "Logged out successfully" },
  });

  clearSessionCookie(response);
  return response;
});
