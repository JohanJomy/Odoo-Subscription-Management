import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { apiHandler, fail, zodToFieldErrors } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/schemas/auth";
import { createSessionToken, setSessionCookie } from "@/server/auth/session";

export const POST = apiHandler(async (request: Request) => {
  const payload = await request.json().catch(() => null);

  const parsed = signupSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(422, "VALIDATION_ERROR", "Invalid signup payload", zodToFieldErrors(parsed.error));
  }

  const { email, password, name, company, phone } = parsed.data;

  // Check email uniqueness upfront
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return fail(409, "EMAIL_TAKEN", "Email already registered", [
      { field: "email", message: "Email already registered" },
    ]);
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const { user, customer } = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name,
          company: company ?? null,
          phone: phone ?? null,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "CUSTOMER",
          customerId: customer.id,
        },
      });

      return { user, customer };
    });

    const token = await createSessionToken({
      sub: user.id,
      role: "CUSTOMER",
      customerId: user.customerId,
    });

    const response = NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          customerId: user.customerId,
          name: customer.name,
        },
      },
      { status: 201 }
    );

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, "EMAIL_TAKEN", "Email already registered", [
        { field: "email", message: "Email already registered" },
      ]);
    }
    throw error;
  }
});
