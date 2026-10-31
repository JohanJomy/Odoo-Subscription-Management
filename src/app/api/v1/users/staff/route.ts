import bcrypt from "bcryptjs";

import { apiHandler, created, fail, zodToFieldErrors } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createStaffSchema } from "@/lib/schemas/auth";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guard";

export const POST = apiHandler(async (request: Request) => {
  const currentAdmin = await requireRole(["ADMIN"], request);

  const payload = await request.json().catch(() => null);
  const parsed = createStaffSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(422, "VALIDATION_ERROR", "Invalid staff payload", zodToFieldErrors(parsed.error));
  }

  const { name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return fail(409, "EMAIL_TAKEN", "Email already registered", [
      { field: "email", message: "Email already registered" },
    ]);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    // Optionally create a staff customer or just staff user
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "STAFF",
        active: true,
      },
    });

    await audit(tx, {
      entity: "User",
      entityId: newUser.id,
      action: "CREATE_STAFF",
      userId: currentAdmin.id,
      detail: JSON.stringify({ email, name, role: "STAFF" }),
    });

    return newUser;
  });

  return created({
    id: user.id,
    email: user.email,
    role: user.role,
    active: user.active,
    name,
    createdAt: user.createdAt,
  });
});

