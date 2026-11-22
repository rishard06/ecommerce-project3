/**
 * Shared recipient resolution for Ticket #14 order emails.
 *
 * Signed-in orders always use the account email. Guest orders carry no user
 * row; the purchaser address captured at checkout is used only when the
 * guest opted in explicitly (`guestEmailOptIn`). Anything else — no user, no
 * opt-in — resolves to `null` and the caller skips the send.
 */

interface OrderContact {
  guestEmail: string | null;
  guestEmailOptIn: boolean;
  user: { email: string } | null;
}

export function resolveOrderEmailRecipient(
  order: OrderContact,
): { to: string; isGuest: boolean } | null {
  if (order.user?.email) {
    return { to: order.user.email, isGuest: false };
  }
  if (order.guestEmailOptIn && order.guestEmail) {
    return { to: order.guestEmail, isGuest: true };
  }
  return null;
}
