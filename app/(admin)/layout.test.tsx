// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The admin nav lives in the route-group layout, not in a page, so it can
 * persist across every `/admin/*` navigation instead of remounting. jsdom
 * cannot resolve nested async Server Components, so this test pins the
 * structural contract (sticky aside inside the layout grid, children in the
 * `min-w-0` content column, skeleton while the profile loads) and the guards.
 * Nav rendering and active-link rules stay covered by AdminNav.test.tsx.
 */

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getSession: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/features/identity/server/guards", () => ({
  getCurrentUser: mocks.getCurrentUser,
  getSession: mocks.getSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
  usePathname: () => "/admin",
}));

vi.mock("@/components/layout/AnnouncementBar", () => ({
  default: () => null,
}));

vi.mock("@/components/layout/NavBar", () => ({
  default: () => <nav aria-label="Primary" />,
}));

import AdminLayout from "./layout";

const ADMIN = { id: "admin-1", email: "ada@tended.store", role: "ADMIN" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue(ADMIN);
  mocks.getSession.mockResolvedValue({
    user: { name: "Ada Doe", email: "ada@tended.store", image: null },
  });
});

afterEach(cleanup);

describe("AdminLayout", () => {
  it("mounts the persistent admin nav aside beside the page content", async () => {
    const ui = await AdminLayout({
      children: <div data-testid="admin-child" />,
    });
    render(ui);

    const child = screen.getByTestId("admin-child");
    const aside = screen.getByRole("complementary");

    // The sidebar is part of the layout grid and sticky on desktop.
    expect(aside).toHaveClass("lg:sticky", "lg:col-span-3");
    // The page renders in the min-w-0 content column, not inside the aside.
    expect(aside).not.toContainElement(child);
    expect(child.parentElement).toHaveClass("min-w-0", "lg:col-span-9");
    // Profile data streams behind a skeleton instead of blocking the frame.
    expect(screen.getByText("Loading admin navigation…")).toBeInTheDocument();
  });

  it("redirects anonymous visitors to the login page", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(AdminLayout({ children: null })).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("renders not-found for authenticated non-admins", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "emma@example.com",
      role: "CUSTOMER",
    });

    await expect(AdminLayout({ children: null })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
