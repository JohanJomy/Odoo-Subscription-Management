import { createHash, randomBytes } from "node:crypto";

export function generatePasswordResetToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  return { token, tokenHash, expiresAt };
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
