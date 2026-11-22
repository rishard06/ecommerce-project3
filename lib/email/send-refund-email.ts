import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/client";
import {
  refundIssuedHtml,
  refundIssuedSubject,
} from "@/lib/email/templates";
import { resolveOrderEmailRecipient } from "@/lib/email/order-recipient";

/**
 * Best-effort full-refund notice for the generic admin refund (Ticket #14).
 * Called after the refund transaction commits; never throws — email failure
 * must not fail the admin action or roll back the refund.
 *
 * The refund is always in full, so the refunded amount is the order total.
 * Guests are reached at the opt-in checkout address; without opt-in there is
 * nothing to send to and the refund still succeeds.
 */
export async function sendRefundIssuedEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  if (!order) return;

  const recipient = resolveOrderEmailRecipient(order);
  if (!recipient) return;

  try {
    await sendEmail({
      to: recipient.to,
      subject: refundIssuedSubject(order.id),
      html: refundIssuedHtml(
        {
          id: order.id,
          totalCents: order.totalCents,
          items: order.items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            lineTotalCents: i.lineTotalCents,
          })),
          shipping: {
            fullName: order.shippingFullName,
            city: order.shippingCity,
            country: order.shippingCountry,
          },
        },
        order.totalCents,
      ),
    });
  } catch (error) {
    console.warn(`[email] refund notice failed for order ${orderId}`, error);
  }
}
