import bcrypt from "bcryptjs";

import { apiHandler, fail, ok, zodToFieldErrors } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/schemas/auth";
import { hashResetToken } from "@/server/auth/password-reset";

export const POST = apiHandler(async (request: Request) => {
  const payload = await request.json().catch(() => null);

  const parsed = resetPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(422, "VALIDATION_ERROR", "Invalid reset payload", zodToFieldErrors(parsed.error));
  }

  const { token, password } = parsed.data;
  const tokenHash = hashResetToken(token);

  const existing = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existing || existing.usedAt || existing.expiresAt < new Date()) {
    return fail(410, "TOKEN_INVALID", "Reset token is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.userId },
      data: { passwordHash },
    });

    await tx.passwordReset.update({
      where: { id: existing.id },
      data: { usedAt: new Date() },
    });
  });

  return ok({ message: "Password has been successfully reset" });
});
