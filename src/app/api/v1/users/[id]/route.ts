import { apiHandler, fail, ok, zodToFieldErrors } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/schemas/auth";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guard";

export const PATCH = apiHandler(async (request: Request, context: any) => {
  const currentAdmin = await requireRole(["ADMIN"], request);
  const params = await context.params;
  const userId = params?.id;

  if (!userId) {
    return fail(400, "BAD_REQUEST", "User ID is required");
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(422, "VALIDATION_ERROR", "Invalid update payload", zodToFieldErrors(parsed.error));
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return fail(404, "NOT_FOUND", "User not found");
  }

  // Prevent self-deactivation
  if (currentAdmin.id === userId && parsed.data.active === false) {
    return fail(409, "CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account");
  }

  // Prevent removing admin from yourself
  if (currentAdmin.id === userId && parsed.data.role && parsed.data.role !== "ADMIN") {
    return fail(409, "CANNOT_DEMOTE_SELF", "You cannot change your own admin role");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        customerId: true,
        createdAt: true,
      },
    });

    await audit(tx, {
      entity: "User",
      entityId: userId,
      action: "UPDATE_USER",
      userId: currentAdmin.id,
      detail: JSON.stringify(parsed.data),
    });

    return user;
  });

  return ok(updated);
});
