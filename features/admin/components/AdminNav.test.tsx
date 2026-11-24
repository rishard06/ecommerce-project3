/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

import { AdminNav } from "./AdminNav";

afterEach(cleanup);

describe("AdminNav", () => {
  it("marks Dashboard active and shows the avatar fallback", () => {
    render(<AdminNav user={{ name: "Ada Doe", email: "ada@tended.store" }} />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "aria-current", "page",
    );
    expect(screen.getByRole("link", { name: /orders/i })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("AD")).toBeInTheDocument();
  });
});
