import { requireAdmin } from "@/features/identity/server/guards";
import { listCoupons } from "@/features/coupons/server/coupon-service";
import {
  CreateCouponForm,
  DeleteCouponForm,
  UpdateCouponForm,
} from "./coupon-forms";
import { formatCents } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Coupons · Admin" };

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function discountLabel(coupon: {
  percentOff: number | null;
  amountOffCents: number | null;
}): string {
  if (coupon.percentOff !== null) return `${coupon.percentOff}% off`;
  if (coupon.amountOffCents !== null) return `${formatCents(coupon.amountOffCents)} off`;
  return "misconfigured";
}

export default async function AdminCouponsPage() {
  // Defense in depth: the layout already redirected non-admins; the page
  // verifies the role again before touching coupons.
  await requireAdmin();

  const coupons = await listCoupons();

  return (
    <main className="grid gap-8">
      <header className="grid gap-1">
        <p className="text-accent-foreground text-xs font-semibold tracking-widest uppercase">
          Admin
        </p>
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <p className="text-muted-foreground text-sm">
          {coupons.length} {coupons.length === 1 ? "coupon" : "coupons"} ·
          exactly one of percent or fixed amount; money is integer cents.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create coupon</CardTitle>
          <CardDescription>
            Codes are stored uppercase. Set either a percent (1–100) or a fixed
            amount in cents — never both.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCouponForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coupons</CardTitle>
          <CardDescription>
            Deleting a coupon never rewrites order history: orders keep a plain
            coupon-code snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th scope="col" className="py-2 pr-4 font-medium">Code</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Discount</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Minimum</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Expires</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Uses</th>
                  <th scope="col" className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium tabular-nums">
                      {coupon.code}
                    </td>
                    <td className="py-3 pr-4">{discountLabel(coupon)}</td>
                    <td className="text-muted-foreground py-3 pr-4 tabular-nums">
                      {formatCents(coupon.minSubtotalCents)}
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">
                      {coupon.expiresAt ? dateFormatter.format(coupon.expiresAt) : "never"}
                    </td>
                    <td className="text-muted-foreground py-3 pr-4 tabular-nums">
                      {coupon.usedCount}
                      {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ""}
                    </td>
                    <td className="py-3">
                      <div className="flex items-start gap-1">
                        <UpdateCouponForm coupon={coupon} />
                        <DeleteCouponForm couponId={coupon.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {coupons.length === 0 && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No coupons yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
