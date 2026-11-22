import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/client";
import {
  returnApprovedHtml,
  returnApprovedSubject,
  returnRejectedHtml,
  returnRejectedSubject,
} from "@/lib/email/templates";
import { resolveOrderEmailRecipient } from "@/lib/email/order-recipient";

async function loadDecisionOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true, returnRequest: true },
  });
  if (!order) return null;

  const recipient = resolveOrderEmailRecipient(order);
  if (!recipient) return null;

  return {
    recipient,
    emailOrder: {
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
    reason: order.returnRequest?.reason ?? "",
  };
}

/**
 * Best-effort return-approval notice (Ticket #14). Called after the approve +
 * refund transactions commit; never throws — email failure must not fail the
 * admin action or roll back the decision. The approve path refunds in full,
 * so the email states the refunded total.
 */
export async function sendReturnApprovedEmail(orderId: string): Promise<void> {
  try {
    const loaded = await loadDecisionOrder(orderId);
    if (!loaded) return;

    await sendEmail({
      to: loaded.recipient.to,
      subject: returnApprovedSubject(orderId),
      html: returnApprovedHtml(
        loaded.emailOrder,
        loaded.emailOrder.totalCents,
        loaded.reason,
      ),
    });
  } catch (error) {
    console.warn(
      `[email] return approval notice failed for order ${orderId}`,
      error,
    );
  }
}

/**
 * Best-effort return-rejection notice (Ticket #14). Called after the reject
 * transaction commits; never throws. Money never moves on reject, and the
 * email says so.
 */
export async function sendReturnRejectedEmail(orderId: string): Promise<void> {
  try {
    const loaded = await loadDecisionOrder(orderId);
    if (!loaded) return;

    await sendEmail({
      to: loaded.recipient.to,
      subject: returnRejectedSubject(orderId),
      html: returnRejectedHtml(loaded.emailOrder, loaded.reason),
    });
  } catch (error) {
    console.warn(
      `[email] return rejection notice failed for order ${orderId}`,
      error,
    );
  }
}
