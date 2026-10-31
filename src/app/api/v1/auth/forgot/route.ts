import { apiHandler, fail, ok, zodToFieldErrors } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { sendPasswordResetEmail } from "@/server/auth/mailer";
import { generatePasswordResetToken } from "@/server/auth/password-reset";

export const POST = apiHandler(async (request: Request) => {
  const payload = await request.json().catch(() => null);

  const parsed = forgotPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(422, "VALIDATION_ERROR", "Invalid forgot password payload", zodToFieldErrors(parsed.error));
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.active) {
    const { token, tokenHash, expiresAt } = generatePasswordResetToken();

    await prisma.$transaction(async (tx) => {
      // Invalidate existing unused tokens
      await tx.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset?token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  // Always return 200 to not reveal whether user exists
  return ok({
    message: "If this email exists, a password reset link has been sent",
  });
});
