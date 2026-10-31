import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { apiHandler, fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  verifySessionToken,
} from "@/server/auth/session";

export const POST = apiHandler(async (request: Request) => {
  let currentToken: string | undefined;
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (match) {
      currentToken = match.substring(SESSION_COOKIE_NAME.length + 1);
    }
  }

  if (!currentToken) {
    return fail(401, "UNAUTHORIZED", "Missing session cookie");
  }

  const session = await verifySessionToken(currentToken);
  if (!session) {
    return fail(401, "UNAUTHORIZED", "Invalid session");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { customer: true },
  });

  if (!user || !user.active) {
    const forbidden = NextResponse.json(
      {
        error: {
          code: "USER_INACTIVE",
          message: "User account is inactive or not found",
        },
      },
      { status: 403 }
    );
    clearSessionCookie(forbidden);
    return forbidden;
  }

  const nextToken = await createSessionToken({
    sub: user.id,
    role: user.role as any,
    customerId: user.customerId,
  });

  const response = NextResponse.json({
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      name: user.customer?.name ?? user.email.split("@")[0],
    },
  });

  setSessionCookie(response, nextToken);
  return response;
});
