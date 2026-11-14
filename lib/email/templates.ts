import { formatCents } from "@/lib/money";

export interface OrderEmailOrder {
  id: string;
  totalCents: number;
  items: Array<{ title: string; quantity: number; lineTotalCents: number }>;
  shipping: { fullName: string; city: string; country: string };
}

export function orderConfirmationSubject(orderId: string): string {
  return `Order confirmed #${orderId.slice(0, 8).toUpperCase()}`;
}

export function orderConfirmationHtml(order: OrderEmailOrder): string {
  const lines = order.items
    .map(
      (i) => `<li>${escapeHtml(i.title)} × ${i.quantity} — ${formatCents(i.lineTotalCents)}</li>`,
    )
    .join("");
  return `<div><h1>Thanks, ${escapeHtml(order.shipping.fullName)}!</h1><p>Order #${escapeHtml(order.id)} totaling ${formatCents(order.totalCents)} is confirmed.</p><ul>${lines}</ul><p>Shipping to ${escapeHtml(order.shipping.city)}, ${escapeHtml(order.shipping.country)}.</p></div>`;
}

export function shippingUpdateHtml(orderId: string, status: string): string {
  return `<div><h1>Order update #${escapeHtml(orderId.slice(0, 8).toUpperCase())}</h1><p>Status: ${escapeHtml(status)}</p></div>`;
}

export function passwordResetHtml(resetUrl: string): string {
  return `<div><p>Reset your password:</p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></div>`;
}

export function verificationHtml(verifyUrl: string): string {
  return `<div><p>Verify your email:</p><a href="${escapeHtml(verifyUrl)}">${escapeHtml(verifyUrl)}</a></div>`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
