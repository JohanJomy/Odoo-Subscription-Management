import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transport: Transporter | null = null;

function getTransport() {
  if (transport) {
    return transport;
  }

  if (process.env.SMTP_HOST) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

    return transport;
  }

  transport = nodemailer.createTransport({ jsonTransport: true });
  return transport;
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const transporter = getTransport();

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM ?? "LoopLedger <no-reply@loopledger.local>",
    to: email,
    subject: "Reset your LoopLedger password",
    text: `Reset your password: ${resetLink}`,
    html: `<p>Reset your LoopLedger password:</p><p><a href=\"${resetLink}\">${resetLink}</a></p>`,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Password reset mail queued", info.messageId);
  }
}
