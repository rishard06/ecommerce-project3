import { requireAdmin } from "@/features/identity/server/guards";
import { listCoupons } from "@/features/coupons/server/coupon-service";
import {
  createCouponAction,
  deleteCouponAction,
  updateCouponAction,
} from "@/features/coupons/server/actions";
import { formatCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Coupons · Admin" };

/** Form actions discard the result object; it exists for programmatic callers. */
async function submitCreate(formData: FormData): Promise<void> {
  "use server";
  await createCouponAction(formData);
}

async function submitUpdate(formData: FormData): Promise<void> {
  "use server";
  await updateCouponAction(formData);
}

async function submitDelete(formData: FormData): Promise<void> {
  "use server";
  await deleteCouponAction(formData);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function discountLabel(coupon: {
  percentOff: number | null;
  amountOffCents: number | null;
}): string {
  if (coupon.percentOff !== null) return `${coupon.percentOff}% off`;
  if (coupon.amountOffCents !== null) return `${formatCents(coupon.amountOffCents)} off`;
  return "misconfigured";
}

function toDateInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 16) : "";
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
          <form action={submitCreate} className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="create-code" className="text-sm font-medium">
                Code
              </label>
              <Input
                id="create-code"
                name="code"
                required
                maxLength={32}
                placeholder="SAVE10"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-min" className="text-sm font-medium">
                Minimum subtotal (cents)
              </label>
              <Input
                id="create-min"
                name="minSubtotalCents"
                type="number"
                min={0}
                step={1}
                placeholder="0"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-percent" className="text-sm font-medium">
                Percent off (1–100)
              </label>
              <Input
                id="create-percent"
                name="percentOff"
                type="number"
                min={1}
                max={100}
                step={1}
                placeholder="10"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-amount" className="text-sm font-medium">
                Fixed amount off (cents)
              </label>
              <Input
                id="create-amount"
                name="amountOffCents"
                type="number"
                min={0}
                step={1}
                placeholder="500"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-expires" className="text-sm font-medium">
                Expires at (optional)
              </label>
              <Input
                id="create-expires"
                name="expiresAt"
                type="datetime-local"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-max" className="text-sm font-medium">
                Max uses (optional)
              </label>
              <Input
                id="create-max"
                name="maxUses"
                type="number"
                min={1}
                step={1}
                placeholder="unlimited"
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Create coupon</Button>
            </div>
          </form>
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
                      <div className="flex items-center gap-1">
                        <form action={submitUpdate} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={coupon.id} />
                          <input type="hidden" name="code" value={coupon.code} />
                          {coupon.percentOff !== null ? (
                            <input
                              type="hidden"
                              name="percentOff"
                              value={coupon.percentOff}
                            />
                          ) : (
                            <input
                              type="hidden"
                              name="amountOffCents"
                              value={coupon.amountOffCents ?? 0}
                            />
                          )}
                          <Input
                            name="minSubtotalCents"
                            type="number"
                            min={0}
                            step={1}
                            defaultValue={coupon.minSubtotalCents}
                            aria-label={`Minimum subtotal for ${coupon.code}`}
                            className="w-24"
                          />
                          <Input
                            name="expiresAt"
                            type="datetime-local"
                            defaultValue={toDateInput(coupon.expiresAt)}
                            aria-label={`Expiry for ${coupon.code}`}
                            className="w-44"
                          />
                          <Input
                            name="maxUses"
                            type="number"
                            min={1}
                            step={1}
                            defaultValue={coupon.maxUses ?? undefined}
                            placeholder="∞"
                            aria-label={`Max uses for ${coupon.code}`}
                            className="w-20"
                          />
                          <Button type="submit" variant="ghost" size="sm">
                            Save
                          </Button>
                        </form>
                        <form action={submitDelete}>
                          <input type="hidden" name="couponId" value={coupon.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Delete
                          </Button>
                        </form>
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
