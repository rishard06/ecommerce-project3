import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminFulfillmentStatusBadge } from "@/features/orders/components/AdminStatusBadges";
import { formatCents } from "@/lib/money";

import type { DashboardRecentOrder } from "../types";
import { AdminPanel } from "./admin-panel";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

/** First letters of the first two words; "Guest Buyer" reads "GB". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Latest transactions for the admin dashboard.
 *
 * The service supplies exactly six rows; this component never fetches. Money is
 * formatted at this boundary and fulfillment is shown separately from payment.
 */
export function AdminRecentOrders({
  orders,
}: {
  orders: DashboardRecentOrder[];
}) {
  return (
    <AdminPanel
      title="Recent orders"
      description="Latest transactions from your store"
      action={
        <Link
          href="/admin/orders"
          className="text-xs font-semibold text-primary-700 underline-offset-4 hover:underline"
        >
          View all
        </Link>
      }
    >
      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm font-medium text-gray-primary">No orders yet.</p>
          <p className="text-xs text-gray-tertiary">
            Orders appear here after a customer checks out.
          </p>
          <Link
            href="/admin/products"
            className="text-xs font-semibold text-primary-700 underline-offset-4 hover:underline"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-tertiary">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Customer
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Order
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Product
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarFallback
                          aria-hidden="true"
                          className="bg-primary-600/10 text-[0.65rem] font-semibold text-primary-600"
                        >
                          {initials(order.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-primary">
                          {order.customerName}
                        </p>
                        <p className="truncate text-xs text-gray-tertiary">
                          {order.customerEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium tabular-nums text-primary-700 underline-offset-4 hover:underline"
                    >
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <p className="text-xs text-gray-tertiary">
                      {dateFormatter.format(order.createdAt)}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-gray-tertiary">
                    <div className="max-w-[180px] truncate">
                      {order.itemTitle ?? "—"}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <AdminFulfillmentStatusBadge
                      status={order.fulfillmentStatus}
                    />
                  </td>
                  <td className="py-3 text-right font-medium tabular-nums text-gray-primary">
                    {formatCents(order.totalCents, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPanel>
  );
}
