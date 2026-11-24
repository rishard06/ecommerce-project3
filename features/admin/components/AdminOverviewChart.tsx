"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCents } from "@/lib/money";

import type { MonthlyMetric } from "../types";

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--primary-600)" },
  orders: { label: "Orders", color: "var(--accent-700)" },
} satisfies ChartConfig;

/** Axis labels stay compact: chart values are cents, so divide before formatting. */
function formatCompactUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) / 100);
}

const CHART_CLASSNAME =
  "mt-4 aspect-auto h-[220px] w-full min-h-[220px] sm:h-[260px]";

/**
 * Monthly revenue and order volume for the current year.
 *
 * Client-only because Tabs and Recharts need hooks; the server passes plain
 * `MonthlyMetric` rows, so nothing serializable leaves the component.
 */
export function AdminOverviewChart({ data }: { data: MonthlyMetric[] }) {
  return (
    <section className="glass-component min-w-0 p-5">
      <Tabs defaultValue="revenue">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-primary">Overview</h2>
            <p className="mt-1 text-xs text-gray-tertiary">
              Monthly performance for the current year
            </p>
          </div>
          <TabsList className="h-8 rounded-full bg-muted p-1">
            <TabsTrigger value="revenue" className="text-xs">
              Revenue
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">
              Orders
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="revenue">
          <ChartContainer config={chartConfig} className={CHART_CLASSNAME}>
            <AreaChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                width={48}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactUsd}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatCents(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenueCents"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.16}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </TabsContent>

        <TabsContent value="orders">
          <ChartContainer config={chartConfig} className={CHART_CLASSNAME}>
            <BarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis width={48} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="orders"
                fill="var(--color-orders)"
                radius={6}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </section>
  );
}
