/**
 * Minimal Resend-backed email client.
 * Uses fetch so no extra dependency is required.
 * All failures throw plain Errors with safe messages.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

function getResendKey(): string | undefined {
  return process.env.RESEND_API_KEY;
}

function getDefaultFrom(): string {
  return process.env.EMAIL_FROM ?? "venn. <orders@example.com>";
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
