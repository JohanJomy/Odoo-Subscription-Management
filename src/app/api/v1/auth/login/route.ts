import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { apiHandler, fail, zodToFieldErrors } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas/auth";
import { createSessionToken, setSessionCookie } from "@/server/auth/session";

export const POST = apiHandler(async (request: Request) => {
  const payload = await request.json().catch(() => null);

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(422, "VALIDATION_ERROR", "Invalid login payload", zodToFieldErrors(parsed.error));
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { customer: true },
  });

  if (!user) {
    return fail(401, "BAD_CREDENTIALS", "Invalid email or password");
  }

  if (!user.active) {
    return fail(403, "USER_INACTIVE", "Your account is deactivated. Please contact an administrator.");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return fail(401, "BAD_CREDENTIALS", "Invalid email or password");
  }

  const token = await createSessionToken({
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

  setSessionCookie(response, token);
  return response;
});
