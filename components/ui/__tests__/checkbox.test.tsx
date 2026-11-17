// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => false };
});

import { Checkbox } from "../checkbox";

afterEach(cleanup);

describe("Checkbox", () => {
  it("exposes a labeled native checkbox with a 44px hit area", () => {
    const { getByRole, container } = render(
      <Checkbox
        checked={false}
        onCheckedChange={() => {}}
        aria-label="Select test item for checkout"
      />,
    );

    const box = getByRole("checkbox", {
      name: "Select test item for checkout",
    });
    expect(box).toBeTruthy();
    expect(box.getAttribute("type")).toBe("checkbox");

    // ui-ux-pro-max touch target minimum: 44x44.
    const hitArea = container.firstElementChild;
    expect(hitArea?.className).toContain("size-11");
  });

  it("notifies with the next value on toggle", () => {
    const onCheckedChange = vi.fn();
    const { getByRole } = render(
      <Checkbox
        checked={false}
        onCheckedChange={onCheckedChange}
        aria-label="Select test item for checkout"
      />,
    );

    fireEvent.click(getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders a dash glyph for the indeterminate state", () => {
    const { container } = render(
      <Checkbox
        checked={false}
        indeterminate
        onCheckedChange={() => {}}
        aria-label="Select all items"
      />,
    );

    // Dash line, not a check path.
    expect(container.querySelector("line")).toBeTruthy();
    expect(container.querySelector("path")).toBeFalsy();
  });

  it("renders a check glyph when checked", () => {
    const { container } = render(
      <Checkbox
        checked
        onCheckedChange={() => {}}
        aria-label="Select test item for checkout"
      />,
    );

    expect(container.querySelector("path")).toBeTruthy();
    expect(container.querySelector("line")).toBeFalsy();
  });
});
