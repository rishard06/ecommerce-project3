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

/**
 * Guest order confirmation (Ticket #14). Same order-summary shape as the
 * signed-in confirmation, but the copy says the shopper checked out as a
 * guest: no account exists, so this email is the receipt. Sent only when the
 * guest opted in explicitly at checkout. Order summary only — never payment
 * details.
 */
export function guestOrderConfirmationSubject(orderId: string): string {
  return `Your order #${orderId.slice(0, 8).toUpperCase()} is confirmed`;
}

export function guestOrderConfirmationHtml(order: OrderEmailOrder): string {
  const lines = order.items
    .map(
      (i) => `<li>${escapeHtml(i.title)} × ${i.quantity} — ${formatCents(i.lineTotalCents)}</li>`,
    )
    .join("");
  return `<div><h1>Thanks, ${escapeHtml(order.shipping.fullName)}!</h1><p>Your order #${escapeHtml(order.id)} totaling ${formatCents(order.totalCents)} is confirmed.</p><ul>${lines}</ul><p>Shipping to ${escapeHtml(order.shipping.city)}, ${escapeHtml(order.shipping.country)}.</p><p>You checked out as a guest — no account was created. Keep this email as your receipt.</p></div>`;
}

/**
 * Full-refund notice for the generic admin refund (Ticket #14). States the
 * refunded amount and the order summary; carries no payment details (no card,
 * intent, or provider internals).
 */
export function refundIssuedSubject(orderId: string): string {
  return `Refund issued for order #${orderId.slice(0, 8).toUpperCase()}`;
}

export function refundIssuedHtml(
  order: OrderEmailOrder,
  refundedCents: number,
): string {
  const lines = order.items
    .map(
      (i) => `<li>${escapeHtml(i.title)} × ${i.quantity} — ${formatCents(i.lineTotalCents)}</li>`,
    )
    .join("");
  return `<div><h1>Refund issued</h1><p>We've issued a full refund of ${formatCents(refundedCents)} for order #${escapeHtml(order.id)}. It can take 5–10 business days to appear on your statement.</p><ul>${lines}</ul><p>Order total was ${formatCents(order.totalCents)}.</p></div>`;
}

/**
 * Return-approval notice (Ticket #14). The approve path refunds in full, so
 * the email states both the approval and the refunded amount. `reason` is the
 * customer's own request text, always escaped.
 */
export function returnApprovedSubject(orderId: string): string {
  return `Return approved for order #${orderId.slice(0, 8).toUpperCase()}`;
}

export function returnApprovedHtml(
  order: OrderEmailOrder,
  refundedCents: number,
  reason: string,
): string {
  const lines = order.items
    .map(
      (i) => `<li>${escapeHtml(i.title)} × ${i.quantity} — ${formatCents(i.lineTotalCents)}</li>`,
    )
    .join("");
  return `<div><h1>Return approved</h1><p>Your return for order #${escapeHtml(order.id)} ("${escapeHtml(reason)}") was approved. A full refund of ${formatCents(refundedCents)} was issued; it can take 5–10 business days to appear on your statement.</p><ul>${lines}</ul><p>Order total was ${formatCents(order.totalCents)}.</p></div>`;
}

/**
 * Return-rejection notice (Ticket #14). Money never moves on reject, so the
 * email says so explicitly. `reason` is the customer's own request text,
 * always escaped.
 */
export function returnRejectedSubject(orderId: string): string {
  return `Update on your return for order #${orderId.slice(0, 8).toUpperCase()}`;
}

export function returnRejectedHtml(
  order: OrderEmailOrder,
  reason: string,
): string {
  const lines = order.items
    .map(
      (i) => `<li>${escapeHtml(i.title)} × ${i.quantity} — ${formatCents(i.lineTotalCents)}</li>`,
    )
    .join("");
  return `<div><h1>Return decision</h1><p>We couldn't approve your return for order #${escapeHtml(order.id)} ("${escapeHtml(reason)}"). No refund was issued. If you have questions, contact support with your order number.</p><ul>${lines}</ul><p>Order total was ${formatCents(order.totalCents)}.</p></div>`;
}

export function fulfillmentEmailSubject(
  orderId: string,
  status: "SHIPPED" | "DELIVERED",
): string {
  const label = status === "SHIPPED" ? "shipped" : "delivered";
  return `Order ${label} #${orderId.slice(0, 8).toUpperCase()}`;
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
