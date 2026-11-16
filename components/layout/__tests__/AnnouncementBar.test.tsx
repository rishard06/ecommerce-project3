// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import AnnouncementBar, {
  ANNOUNCEMENT_DISMISS_TTL_MS,
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

    // Versioned record: which message was dismissed, and when.
    const raw = window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const record = JSON.parse(raw ?? "{}") as {
      message?: unknown;
      dismissedAt?: unknown;
    };
    expect(record.message).toBe(ANNOUNCEMENT_MESSAGE);
    expect(typeof record.dismissedAt).toBe("number");

    unmount();
    render(<AnnouncementBar />);

    expect(screen.queryByText(ANNOUNCEMENT_MESSAGE)).toBeNull();
  });

  it("re-shows the bar when the message copy changes", () => {
    // A record from an older announcement must not suppress the new one.
    window.localStorage.setItem(
      ANNOUNCEMENT_STORAGE_KEY,
      JSON.stringify({ message: "An older announcement", dismissedAt: Date.now() }),
    );

    render(<AnnouncementBar />);

    expect(screen.queryByText(ANNOUNCEMENT_MESSAGE)).not.toBeNull();
  });

  it("re-shows the bar once the dismissal has expired", () => {
    const { unmount } = render(<AnnouncementBar />);
    dismiss();

    // Age the stored dismissal past the TTL.
    const record = JSON.parse(
      window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) ?? "{}",
    ) as { message?: string; dismissedAt?: number };
    window.localStorage.setItem(
      ANNOUNCEMENT_STORAGE_KEY,
      JSON.stringify({
        ...record,
        dismissedAt: Date.now() - ANNOUNCEMENT_DISMISS_TTL_MS - 1,
      }),
    );

    unmount();
    render(<AnnouncementBar />);

    expect(screen.queryByText(ANNOUNCEMENT_MESSAGE)).not.toBeNull();
  });
});
