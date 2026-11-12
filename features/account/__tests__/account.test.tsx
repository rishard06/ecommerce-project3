// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
}));

import { AccountNav } from "../components/AccountNav";

describe("account nav", () => {
  it("shows a sign-in prompt when there is no user", () => {
    render(<AccountNav user={null} />);

    expect(screen.getByText(/sign in/i)).toBeTruthy();
  });

  it("shows the user and account links when signed in", () => {
    render(
      <AccountNav
        user={{ name: "Ada Lovelace", email: "ada@example.com", image: null }}
      />
    );

    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByRole("link", { name: /orders/i })).toBeTruthy();
  });
});
