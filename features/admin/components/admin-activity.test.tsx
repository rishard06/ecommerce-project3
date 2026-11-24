/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminActivity } from "./admin-activity";
import type { DashboardActivity } from "../types";

afterEach(cleanup);

const entry: DashboardActivity = {
  id: "log-1", orderId: "order-12345678", action: "FULFILLMENT_UPDATED",
  fromStatus: "PROCESSING", toStatus: "SHIPPED",
  createdAt: new Date("2026-11-24T10:00:00Z"), timeAgo: "2 min ago",
};

describe("AdminActivity", () => {
  it("renders real audit entries", () => {
    render(<AdminActivity entries={[entry]} />);
    expect(screen.getByText(/fulfillment updated/i)).toBeInTheDocument();
    expect(screen.getByText(/2 min ago/i)).toBeInTheDocument();
  });

  it("uses sample rows with a Sample badge when the log is empty", () => {
    render(<AdminActivity entries={[]} />);
    expect(screen.getByText("Sample")).toBeInTheDocument();
    expect(screen.getByText(/new order placed/i)).toBeInTheDocument();
  });
});
