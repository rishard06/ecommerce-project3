// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import AnnouncementBar, {
  ANNOUNCEMENT_MESSAGE,
  ANNOUNCEMENT_STORAGE_KEY,
} from "../AnnouncementBar";

function dismiss() {
  fireEvent.click(
    screen.getByRole("button", { name: /dismiss announcement/i }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("AnnouncementBar", () => {
  it("renders the one-line message with a Lucide dismiss control", () => {
    const { container } = render(<AnnouncementBar />);

    expect(screen.getByText(ANNOUNCEMENT_MESSAGE)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /dismiss announcement/i }),
    ).toBeTruthy();
    expect(container.querySelector(".lucide-x")).toBeTruthy();
  });

  it("hides the message on dismiss while reserving the bar's space", () => {
    const { container } = render(<AnnouncementBar />);
    const shell = container.firstElementChild as HTMLElement;

    expect(shell.className).toContain("h-9");

    dismiss();

    expect(screen.queryByText(ANNOUNCEMENT_MESSAGE)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /dismiss announcement/i }),
    ).toBeNull();
    // The fixed-height shell stays in flow so surrounding content never shifts.
    expect(container.firstElementChild).toBe(shell);
    expect(shell.className).toContain("h-9");
  });

  it("persists the dismissal for later visits", () => {
    const { unmount } = render(<AnnouncementBar />);

    dismiss();

    expect(window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY)).toBe("1");

    unmount();
    render(<AnnouncementBar />);

    expect(screen.queryByText(ANNOUNCEMENT_MESSAGE)).toBeNull();
  });
});
