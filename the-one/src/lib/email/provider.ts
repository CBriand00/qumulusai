import "server-only";

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  Modular email service layer (Resend-compatible).
 * ────────────────────────────────────────────────────────────────────────────
 *  Default provider logs to the console so development needs no email key.
 *  Set EMAIL_PROVIDER=resend and RESEND_API_KEY to send real email.
 */
import { siteConfig } from "@/config/site";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id: string }>;
}

/** Console provider — records email in the server log during development. */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<{ id: string }> {
    console.info("[email:console]", {
      to: message.to,
      subject: message.subject,
    });
    return { id: `console-${Date.now()}` };
  }
}

/** Resend provider stub — enable when RESEND_API_KEY is configured. */
class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey = process.env.RESEND_API_KEY) {}
  async send(message: EmailMessage): Promise<{ id: string }> {
    if (!this.apiKey) throw new Error("RESEND_API_KEY is not configured.");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? `${siteConfig.name} <no-reply@theone.example>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend error ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as { id: string };
    return { id: data.id };
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  return provider === "resend" ? new ResendEmailProvider() : new ConsoleEmailProvider();
}
