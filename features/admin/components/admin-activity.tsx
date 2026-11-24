import {
  Check,
  CreditCard,
  RotateCcw,
  ShoppingBag,
  Truck,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { DashboardActivity } from "../types";
import { AdminPanel } from "./admin-panel";

interface ActionMeta {
  label: string;
  icon: LucideIcon;
  className: string;
}

/**
 * Audit-action presentation. Labels describe the event only.
 *
 * ORDER_PLACED, PAYMENT_RECEIVED and CUSTOMER_REGISTERED exist for the sample
 * feed: the storefront does not write those actions into the audit log yet.
 */
const ACTION_META: Record<string, ActionMeta> = {
  FULFILLMENT_UPDATED: {
    label: "Fulfillment updated",
    icon: Truck,
    className: "bg-primary-600/10 text-primary-600",
  },
  ORDER_REFUNDED: {
    label: "Order refunded",
    icon: RotateCcw,
    className: "bg-destructive/10 text-destructive",
  },
  RETURN_APPROVED: {
    label: "Return approved",
    icon: Check,
    className: "bg-accent-700/15 text-accent-text",
  },
  RETURN_REJECTED: {
    label: "Return rejected",
    icon: X,
    className: "bg-destructive/10 text-destructive",
  },
  ORDER_PLACED: {
    label: "New order placed",
    icon: ShoppingBag,
    className: "bg-primary-600/10 text-primary-600",
  },
  PAYMENT_RECEIVED: {
    label: "Payment received",
    icon: CreditCard,
    className: "bg-accent-700/15 text-accent-text",
  },
  CUSTOMER_REGISTERED: {
    label: "New customer registered",
    icon: UserPlus,
    className: "bg-primary-600/10 text-primary-600",
  },
};

/** Fallback for actions added after this component ships. */
const DEFAULT_ICON: LucideIcon = ShoppingBag;
const DEFAULT_CHIP_CLASS = "bg-gray-primary/[0.06] text-gray-tertiary";

/** Turns SCREAMING_SNAKE_CASE into a readable sentence-case label. */
function humanize(action: string): string {
  const words = action.toLowerCase().replaceAll("_", " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Real rows describe the order and, when present, the status transition. */
function describeEntry(entry: DashboardActivity): string {
  const orderRef = `Order #${entry.orderId.slice(0, 8).toUpperCase()}`;

  return entry.fromStatus && entry.toStatus
    ? `${orderRef} · ${entry.fromStatus} → ${entry.toStatus}`
    : orderRef;
}

/**
 * Six sample rows for a store with no audit history yet. Purely presentational:
 * they are never persisted and appear only when the feed is empty.
 */
const SAMPLE_ACTIVITY: readonly DashboardActivity[] = [
  {
    id: "sample-order-placed",
    orderId: "8f2c1a9b4d6e7f01",
    action: "ORDER_PLACED",
    fromStatus: null,
    toStatus: "PENDING",
    createdAt: new Date("2026-11-24T09:54:00Z"),
    timeAgo: "6 min ago",
    detail: "Order #8F2C1A9B · $299.00 · Emma Wilson",
  },
  {
    id: "sample-payment-1",
    orderId: "8f2c1a9b4d6e7f01",
    action: "PAYMENT_RECEIVED",
    fromStatus: "PENDING",
    toStatus: "PAID",
    createdAt: new Date("2026-11-24T09:51:00Z"),
    timeAgo: "9 min ago",
    detail: "Order #8F2C1A9B · $299.00 · Stripe",
  },
  {
    id: "sample-customer-1",
    orderId: "8f2c1a9b4d6e7f01",
    action: "CUSTOMER_REGISTERED",
    fromStatus: null,
    toStatus: null,
    createdAt: new Date("2026-11-24T09:36:00Z"),
    timeAgo: "24 min ago",
    detail: "Ada Lovelace · GitHub",
  },
  {
    id: "sample-payment-2",
    orderId: "c4d5e6f7a8b9c0d1",
    action: "PAYMENT_RECEIVED",
    fromStatus: "PENDING",
    toStatus: "PAID",
    createdAt: new Date("2026-11-24T09:22:00Z"),
    timeAgo: "38 min ago",
    detail: "Order #C4D5E6F7 · $84.50 · Stripe",
  },
  {
    id: "sample-customer-2",
    orderId: "d9e0f1a2b3c4d5e6",
    action: "CUSTOMER_REGISTERED",
    fromStatus: null,
    toStatus: null,
    createdAt: new Date("2026-11-24T09:05:00Z"),
    timeAgo: "55 min ago",
    detail: "Grace Hopper · Credentials",
  },
  {
    id: "sample-payment-3",
    orderId: "d9e0f1a2b3c4d5e6",
    action: "PAYMENT_RECEIVED",
    fromStatus: "PENDING",
    toStatus: "PAID",
    createdAt: new Date("2026-11-24T08:12:00Z"),
    timeAgo: "2 hr ago",
    detail: "Order #D9E0F1A2 · $1,140.00 · Stripe",
  },
];

/**
 * Recent audit events for the admin dashboard.
 *
 * There is no audit-log route yet, so the panel has no "View all" action. An
 * empty feed renders sample rows under an explicit Sample badge instead of a
 * blank card.
 */
export function AdminActivity({
  entries,
}: {
  entries: DashboardActivity[];
}) {
  const isSample = entries.length === 0;
  const rows = isSample ? SAMPLE_ACTIVITY : entries;

  return (
    <AdminPanel
      title="Recent activity"
      description="Latest events from your store"
      action={isSample ? <Badge variant="outline">Sample</Badge> : undefined}
    >
      <ul className="space-y-3">
        {rows.map((row) => {
          const meta = ACTION_META[row.action];
          const Icon = meta?.icon ?? DEFAULT_ICON;

          return (
            <li key={row.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  meta?.className ?? DEFAULT_CHIP_CLASS,
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-primary">
                  {meta?.label ?? humanize(row.action)}
                </p>
                <p className="truncate text-xs text-gray-tertiary">
                  {row.detail ?? describeEntry(row)}
                </p>
              </div>
              <time
                dateTime={row.createdAt.toISOString()}
                className="shrink-0 text-xs text-gray-tertiary"
              >
                {row.timeAgo}
              </time>
            </li>
          );
        })}
      </ul>
    </AdminPanel>
  );
}
