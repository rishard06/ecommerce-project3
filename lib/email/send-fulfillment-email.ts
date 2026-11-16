import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/client";
import {
  fulfillmentEmailSubject,
  shippingUpdateHtml,
} from "@/lib/email/templates";

/**
 * Best-effort SHIPPED / DELIVERED notification. Called after the fulfillment
 * transaction commits; never throws — email failure must not fail the admin
 * action or roll back the transition.
 *
 * Recipient lookup mirrors `sendOrderConfirmation` (Task 2): the order's user
 * email. Guest orders store no email address (`userId` null, `customerEmail`
 * falls back to "guest" in admin reads), so there is nothing to send to and
 * the transition still succeeds.
 */
export async function sendFulfillmentEmail(
  orderId: string,
  status: "SHIPPED" | "DELIVERED",
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) return;

  const to = order.user?.email;
  if (!to) return;

  try {
    await sendEmail({
      to,
      subject: fulfillmentEmailSubject(order.id, status),
      html: shippingUpdateHtml(order.id, status),
    });
  } catch (error) {
    console.warn(`[email] fulfillment ${status} failed for order ${orderId}`, error);
  }
}
