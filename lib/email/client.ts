/**
 * Minimal Resend-backed email client.
 * Uses fetch so no extra dependency is required.
 * All failures throw plain Errors with safe messages.
 */

import { getServerEnv } from "../env";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Reads the Resend key through the validated server env schema so the
 * `""` → absent normalization in `lib/env.ts` applies at runtime.
 * Falls back to a normalized raw read when the full server schema is not
 * satisfied (e.g. unit tests stubbing only email vars), preserving the
 * dev fallback: absent/empty key means log + deterministic dev id.
 */
function getResendKey(): string | undefined {
  try {
    return getServerEnv().RESEND_API_KEY;
  } catch {
    const raw = process.env.RESEND_API_KEY;
    return raw === "" ? undefined : raw;
  }
}

function getDefaultFrom(): string {
  try {
    return getServerEnv().EMAIL_FROM ?? "tended. <orders@example.com>";
  } catch {
    const raw = process.env.EMAIL_FROM;
    return (raw === "" ? undefined : raw) ?? "tended. <orders@example.com>";
  }
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const to = input.to.trim();
  if (!to) throw new Error("Email recipient is required");
  if (!input.subject.trim()) throw new Error("Email subject is required");
  if (!input.html.trim()) throw new Error("Email body is required");

  const apiKey = getResendKey();
  const from = input.from ?? getDefaultFrom();

  // No provider configured (local/dev): log and return a deterministic id
  // so checkout/webhook flows stay testable without network.
  if (!apiKey) {
    console.log(`[email:dev] to=${to} subject=${input.subject}`);
    return { id: `dev-${Date.now()}` };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject: input.subject, html: input.html }),
  });

  if (!res.ok) {
    throw new Error("Unable to send email");
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: data.id ?? `resend-${Date.now()}` };
}
