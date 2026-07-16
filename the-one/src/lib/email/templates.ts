import { siteConfig } from "@/config/site";
import type { EmailMessage } from "./provider";

/** Reusable, brand-consistent email templates. */
function wrap(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:Georgia,serif;background:#faf8f4;padding:32px;color:#141414">
    <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e7e1d8;border-radius:6px;padding:32px">
      <h1 style="font-size:22px;margin:0 0 16px">${siteConfig.name}</h1>
      <h2 style="font-size:18px;color:#3a2f26">${title}</h2>
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#4a4038">${bodyHtml}</div>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#9a9088;margin-top:32px">
        ${siteConfig.tagline}
      </p>
    </div></body></html>`;
}

export function applicationSubmittedEmail(to: string, code: string): EmailMessage {
  return {
    to,
    subject: `Your application has been received — ${siteConfig.name}`,
    html: wrap(
      "Application received",
      `<p>Thank you. Your application has been received and will be reviewed privately.</p>
       <p>Your application ID is <strong>${code}</strong>.</p>
       <p>Submitting an application does not guarantee a response, approval, conversation, or date.</p>`,
    ),
    text: `Your application ${code} has been received and will be reviewed privately.`,
  };
}

export function statusUpdatedEmail(to: string, statusLabel: string): EmailMessage {
  return {
    to,
    subject: `An update on your application — ${siteConfig.name}`,
    html: wrap(
      "Application update",
      `<p>There is an update to your application. Please sign in to your private dashboard to view it.</p>
       <p>Current status: <strong>${statusLabel}</strong>.</p>`,
    ),
  };
}

export function messagingUnlockedEmail(to: string): EmailMessage {
  return {
    to,
    subject: `You've been invited to connect — ${siteConfig.name}`,
    html: wrap(
      "An invitation to connect",
      `<p>Messaging has been opened for your application. Please sign in to begin a private conversation.</p>`,
    ),
  };
}
