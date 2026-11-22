import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/client";
import {
  guestOrderConfirmationHtml,
  guestOrderConfirmationSubject,
  orderConfirmationHtml,
  orderConfirmationSubject,
} from "@/lib/email/templates";
import { resolveOrderEmailRecipient } from "@/lib/email/order-recipient";

/**
 * Best-effort order confirmation. Called after the webhook transaction
 * commits; never throws — email failure must not fail the webhook.
 *
 * Signed-in buyers get the account confirmation at their user email. Guests
 * get the guest confirmation at the purchaser address captured at checkout,
 * but only with explicit opt-in; without it there is nothing to send to and
 * the webhook still succeeds.
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });
    if (!order) return;

    const recipient = resolveOrderEmailRecipient(order);
    if (!recipient) return;

    const emailOrder = {
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
    };

    await sendEmail(
      recipient.isGuest
        ? {
            to: recipient.to,
            subject: guestOrderConfirmationSubject(order.id),
            html: guestOrderConfirmationHtml(emailOrder),
          }
        : {
            to: recipient.to,
            subject: orderConfirmationSubject(order.id),
            html: orderConfirmationHtml(emailOrder),
          },
    );
  } catch (error) {
    console.warn(`[email] confirmation failed for order ${orderId}`, error);
  }
}
