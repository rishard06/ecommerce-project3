// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/Logo", () => ({
  default: () => <span data-testid="logo" />,
}));
vi.mock("@/components/layout/MobileMenu", () => ({ default: () => null }));
vi.mock("@/components/layout/Search", () => ({ default: () => null }));
vi.mock("@/components/layout/UserAction", () => ({ default: () => null }));
vi.mock("@/features/cart/components/CartAction", () => ({ default: () => null }));
vi.mock("@/features/cart/components/CartBadge", () => ({
  CartBadge: () => null,
}));

import NavBar from "../NavBar";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
  });
}

function scrollTo(value: number) {
  setScrollY(value);
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

function renderBar() {
  const { unmount } = render(<NavBar />);
  const nav = screen.getByRole("navigation", { name: "Primary" });
  const bar = nav.firstElementChild as HTMLElement;

  return { nav, bar, unmount };
}

beforeEach(() => {
  setScrollY(0);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("NavBar material", () => {
  it("renders transparent over the hero and keeps print behaviour", () => {
    const { nav, bar } = renderBar();

    expect(bar.className).toContain("bg-transparent");
    expect(bar.className).not.toContain("glass-control");
    expect(nav.className).toContain("print:hidden");
  });

  it("stays transparent at any scroll position (no glass material)", () => {
    const { bar } = renderBar();

    scrollTo(200);

    expect(bar.className).toContain("bg-transparent");
    expect(bar.className).not.toContain("glass-control");

    scrollTo(0);

    expect(bar.className).toContain("bg-transparent");
    expect(bar.className).not.toContain("glass-control");
  });

  it("attaches no scroll listener", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    const { unmount } = renderBar();

    expect(
      addSpy.mock.calls.some(([type]) => type === "scroll"),
    ).toBe(false);

    unmount();
  });
});

it("anchors the favorites badge to the icon, not a distant ancestor", () => {
  render(<NavBar />);
  const favLink = screen.getByRole("link", { name: /favorites/i });
  // CartBadge is absolutely positioned; without a positioned wrapper it
  // flies to the nearest positioned ancestor up the tree (misaligned count).
  expect(favLink.className).toMatch(/(^| )relative( |$)/);
});
