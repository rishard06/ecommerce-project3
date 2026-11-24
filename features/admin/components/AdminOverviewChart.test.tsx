/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));
vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import { AdminOverviewChart } from "./AdminOverviewChart";

afterEach(cleanup);

describe("AdminOverviewChart", () => {
  it("offers Revenue and Orders tabs only", () => {
    render(<AdminOverviewChart data={[{ month: "Nov", revenueCents: 1000, orders: 1 }]} />);
    expect(screen.getByRole("tab", { name: /revenue/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /orders/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /profit/i })).not.toBeInTheDocument();
  });
});
