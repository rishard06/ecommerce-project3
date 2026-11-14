import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/client";
import {
  orderConfirmationHtml,
  orderConfirmationSubject,
} from "@/lib/email/templates";
import { formatCents } from "@/lib/money";

void formatCents;

/**
 * Best-effort order confirmation. Called after the webhook transaction
 * commits; never throws — email failure must not fail the webhook.
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  if (!order) return;

  const to = order.user?.email;
  if (!to) return;

  try {
    await sendEmail({
      to,
      subject: orderConfirmationSubject(order.id),
      html: orderConfirmationHtml({
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
      }),
    });
  } catch (error) {
    console.warn(`[email] confirmation failed for order ${orderId}`, error);
  }
}
