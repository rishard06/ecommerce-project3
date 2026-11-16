// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The shaders render on WebGL, which jsdom cannot provide; the grain overlay
// is plain DOM/CSS and is what this test covers.
vi.mock("@paper-design/shaders-react", () => ({
  MeshGradient: () => <div data-testid="mesh" />,
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => false };
});

import MeshGradientBackground from "../MeshGradientBackground";

afterEach(cleanup);

describe("MeshGradientBackground grain", () => {
  it("covers the viewport behind all content (fixed, non-interactive)", () => {
    const { container } = render(<MeshGradientBackground />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
    expect(root.className).toContain("-z-10");
    expect(root.className).toContain("pointer-events-none");
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });

  it("lays a static 4% SVG-noise grain over the mesh, inert to pointer and AT", () => {
    const { container } = render(<MeshGradientBackground />);
    const grain = container.querySelector<HTMLElement>("[data-grain]");

    expect(grain).not.toBeNull();
    expect(grain?.getAttribute("aria-hidden")).toBe("true");
    expect(grain?.className).toContain("pointer-events-none");
    expect(grain?.className).toContain("opacity-[0.04]");
    expect(grain?.style.backgroundImage).toContain("data:image/svg+xml");
  });
});
