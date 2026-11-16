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

import NavBar, { HERO_SCROLL_THRESHOLD } from "../NavBar";

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

  it("turns to glass once the page scrolls past the hero threshold", () => {
    const { bar, nav } = renderBar();

    scrollTo(HERO_SCROLL_THRESHOLD);

    expect(bar.className).toContain("bg-transparent");
    expect(bar.className).not.toContain("glass-control");
    expect(nav.className).not.toContain("pt-[18px]");

    scrollTo(HERO_SCROLL_THRESHOLD + 1);

    expect(bar.className).toContain("glass-control");
    expect(bar.className).not.toContain("bg-transparent");
    // Half the announcement height (h-9 = 36px): breathing room once stuck.
    expect(nav.className).toContain("pt-[18px]");
  });

  it("returns to transparent when scrolled back to the top", () => {
    const { nav, bar } = renderBar();

    scrollTo(HERO_SCROLL_THRESHOLD + 200);
    expect(bar.className).toContain("glass-control");
    expect(nav.className).toContain("pt-[18px]");

    scrollTo(0);
    expect(bar.className).toContain("bg-transparent");
    expect(nav.className).not.toContain("pt-[18px]");
  });

  it("listens passively and removes the listener on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderBar();

    const scrollAdd = addSpy.mock.calls.find(([type]) => type === "scroll");
    expect(scrollAdd).toBeDefined();
    expect(scrollAdd?.[2]).toMatchObject({ passive: true });

    unmount();

    expect(
      removeSpy.mock.calls.some(([type]) => type === "scroll"),
    ).toBe(true);
  });

  it("refreshes into the glass state when mounted mid-page", () => {
    setScrollY(HERO_SCROLL_THRESHOLD + 100);

    const { bar } = renderBar();

    expect(bar.className).toContain("glass-control");
    expect(bar.className).not.toContain("bg-transparent");
  });
});

it("anchors the favorites badge to the icon, not a distant ancestor", () => {
  render(<NavBar />);
  const favLink = screen.getByRole("link", { name: /favorites/i });
  // CartBadge is absolutely positioned; without a positioned wrapper it
  // flies to the nearest positioned ancestor up the tree (misaligned count).
  expect(favLink.className).toMatch(/(^| )relative( |$)/);
});
