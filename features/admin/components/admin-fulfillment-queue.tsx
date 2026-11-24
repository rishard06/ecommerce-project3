import { Progress } from "@/components/ui/progress";
import type { FulfillmentSlice } from "@/features/admin/types";
import type { FulfillmentStatus } from "@/features/orders/types";

import { AdminPanel } from "./admin-panel";

/** Indicator per fulfillment state; CANCELLED stays destructive and last. */
const INDICATOR_CLASSES: Record<FulfillmentStatus, string> = {
  UNFULFILLED: "bg-accent-700",
  PROCESSING: "bg-primary-600",
  SHIPPED: "bg-primary-800",
  DELIVERED: "bg-gray-quaternary",
  CANCELLED: "bg-destructive",
};

/** One-decimal share, NaN-safe so a missing slice never prints "NaN". */
function formatPct(pct: number): string {
  return `${Number.isFinite(pct) ? Math.round(pct * 10) / 10 : 0}%`;
}

export function AdminFulfillmentCard({
  fulfillment,
}: {
  fulfillment: FulfillmentSlice[];
}) {
  const total = fulfillment.reduce((sum, slice) => sum + slice.count, 0);
  const isEmpty = fulfillment.length === 0 || total === 0;

  return (
    <AdminPanel
      title="Fulfillment queue"
      description="Paid orders by fulfillment state"
    >
      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm font-medium text-gray-primary">
            No paid orders in the queue.
          </p>
          <p className="text-xs text-gray-tertiary">
            Fulfillment work appears after an order is paid.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {fulfillment.map((slice) => (
            <li key={slice.status} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-gray-primary">
                  {slice.status}
                </span>
                <span className="tabular-nums text-gray-tertiary">
                  <span className="font-semibold text-gray-primary">
                    {slice.count}
                  </span>{" "}
                  · {formatPct(slice.sharePct)}
                </span>
              </div>
              <Progress
                value={slice.sharePct}
                className="h-2"
                indicatorClassName={INDICATOR_CLASSES[slice.status]}
                aria-label={`${slice.status} share`}
                /* The shared Progress wrapper uses `value` for the indicator but
                   does not forward it to the Radix root, so state the value to
                   assistive tech explicitly. */
                aria-valuenow={Math.round(slice.sharePct)}
                aria-valuetext={formatPct(slice.sharePct)}
              />
            </li>
          ))}
        </ul>
      )}
    </AdminPanel>
  );
}
