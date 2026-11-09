import Link from "next/link";
import { requireAdmin } from "@/features/identity/server/guards";
import { listOrdersForAdmin } from "@/features/orders/server/admin-order-service";
import {
  AdminFulfillmentStatusBadge,
  AdminOrderStatusBadge,
  AdminPaymentStatusBadge,
} from "@/features/orders/components/AdminStatusBadges";
import { formatCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Orders · Admin" };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminOrdersPage() {
  // Defense in depth: the layout already guarded this route.
  await requireAdmin();

  const orders = await listOrdersForAdmin();

  return (
    <main className="grid gap-8">
      <header className="grid gap-1">
        <p className="text-accent-foreground text-xs font-semibold tracking-widest uppercase">
          Admin
        </p>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground text-sm">
          {orders.length} {orders.length === 1 ? "order" : "orders"} · payment
          status comes from Stripe webhooks and is separate from fulfillment.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All orders</CardTitle>
          <CardDescription>
            Newest first. Open an order to manage fulfillment and review its
            audit history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Order
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Order status
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Payment
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Fulfillment
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Total
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium tabular-nums">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-muted-foreground">
                        {dateFormatter.format(order.createdAt)}
                      </div>
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">
                      {order.customerEmail}
                    </td>
                    <td className="py-3 pr-4">
                      <AdminOrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 pr-4">
                      {order.paymentStatus ? (
                        <AdminPaymentStatusBadge status={order.paymentStatus} />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          No payment record
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <AdminFulfillmentStatusBadge
                        status={order.fulfillmentStatus}
                      />
                    </td>
                    <td className="py-3 pr-4 font-medium tabular-nums">
                      {formatCents(order.totalCents)}
                    </td>
                    <td className="py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/orders/${order.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No orders yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
