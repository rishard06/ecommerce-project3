import Link from "next/link";

import type { OrderStatusSlice } from "@/features/admin/types";

import { AdminPanel } from "./admin-panel";

/** Accent, primary and destructive read as distinct slices in both themes. */
const DONUT_COLORS = [
  "var(--accent-700)",
  "var(--primary-600)",
  "var(--destructive)",
] as const;

/** One-decimal share, NaN-safe so a missing slice never prints "NaN". */
function formatPct(pct: number): string {
  return `${Number.isFinite(pct) ? Math.round(pct * 10) / 10 : 0}%`;
}

/**
 * Builds the donut from cumulative shares. The final stop is forced to 100% so
 * one-decimal rounding (e.g. 33.3 + 33.3 + 33.3) cannot leave a visible sliver.
 */
function buildDonutGradient(statuses: readonly OrderStatusSlice[]): string {
  let cursor = 0;

  const stops = statuses.map((slice, index) => {
    const start = Math.min(100, Math.max(0, cursor));
    cursor += Number.isFinite(slice.sharePct) ? slice.sharePct : 0;
    const end =
      index === statuses.length - 1
        ? 100
        : Math.min(100, Math.max(start, cursor));

    return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}% ${end}%`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

export function AdminOrderStatusCard({
  statuses,
}: {
  statuses: OrderStatusSlice[];
}) {
  const total = statuses.reduce((sum, slice) => sum + slice.count, 0);
  const isEmpty = statuses.length === 0 || total === 0;

  return (
    <AdminPanel
      title="Order status"
      description="All orders by payment state"
    >
      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm font-medium text-gray-primary">No orders yet.</p>
          <p className="text-xs text-gray-tertiary">
            Payment status appears once an order is placed.
          </p>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-primary-700 underline-offset-4 hover:underline"
          >
            View orders
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div
            role="img"
            aria-label={`Order status: ${total} ${
              total === 1 ? "order" : "orders"
            }`}
            className="relative size-36 shrink-0 rounded-full"
            style={{ background: buildDonutGradient(statuses) }}
          >
            <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card text-center">
              <span className="text-xl font-bold text-gray-primary">
                {total.toLocaleString("en-US")}
              </span>
              <span className="text-[0.65rem] uppercase tracking-wide text-gray-tertiary">
                {total === 1 ? "order" : "orders"}
              </span>
            </div>
          </div>

          <ul className="w-full min-w-0 space-y-2">
            {statuses.map((slice, index) => (
              <li
                key={slice.status}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    background: DONUT_COLORS[index % DONUT_COLORS.length],
                  }}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-gray-primary">
                  {slice.status}
                </span>
                <span className="tabular-nums text-gray-tertiary">
                  {slice.count}
                </span>
                <span className="w-12 text-right font-semibold tabular-nums text-gray-primary">
                  {formatPct(slice.sharePct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminPanel>
  );
}
