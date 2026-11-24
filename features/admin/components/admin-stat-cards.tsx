import {
  DollarSign,
  Eye,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { AdminDashboardStats } from "@/features/admin/types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Month-over-month delta. `null` means there is no prior month to compare
 * against, so nothing is rendered rather than a misleading zero.
 */
function AdminDelta({ value }: { value: number | null }) {
  if (value === null) {
    return null;
  }

  if (value === 0) {
    return (
      <p className="text-xs font-medium text-gray-tertiary">
        0.0% <span className="font-normal">vs last month</span>
      </p>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs font-semibold",
        isPositive ? "text-accent-text" : "text-destructive",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {`${isPositive ? "+" : "-"}${Math.abs(value).toFixed(1)}%`}
      <span className="font-normal text-gray-tertiary">vs last month</span>
    </p>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
  /** Optional native tooltip on the label, used to disambiguate the metric. */
  labelTitle?: string;
  footer: ReactNode;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  labelTitle,
  footer,
}: StatCardProps) {
  return (
    <article className="glass-component flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <p
          title={labelTitle}
          className="text-xs font-semibold uppercase tracking-wide text-gray-tertiary"
        >
          {label}
        </p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            iconClassName,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-gray-primary">
        {value}
      </p>
      {footer}
    </article>
  );
}

/** Headline metrics for the admin dashboard; all money stays in integer cents. */
export function AdminStatCards({ stats }: { stats: AdminDashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Revenue"
        value={formatCents(stats.revenueCents)}
        icon={DollarSign}
        iconClassName="bg-accent-700/15 text-accent-text"
        footer={<AdminDelta value={stats.revenueDeltaPct} />}
      />
      <StatCard
        label="Customers"
        value={stats.customerCount.toLocaleString("en-US")}
        icon={Users}
        iconClassName="bg-primary-600/10 text-primary-600"
        labelTitle="Registered buyers with at least one order — guest checkouts excluded"
        footer={<AdminDelta value={stats.customerDeltaPct} />}
      />
      <StatCard
        label="Total Orders"
        value={stats.orderCount.toLocaleString("en-US")}
        icon={ShoppingBag}
        iconClassName="bg-primary-600/10 text-primary-600"
        footer={<AdminDelta value={stats.orderDeltaPct} />}
      />
      <StatCard
        label="Page Views"
        value="—"
        icon={Eye}
        iconClassName="bg-gray-primary/[0.06] text-gray-tertiary"
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Not configured</Badge>
            <span className="text-xs text-gray-tertiary">Not tracked yet</span>
          </div>
        }
      />
    </div>
  );
}
