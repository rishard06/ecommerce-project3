// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefreshOnPendingPayment } from "../RefreshOnPendingPayment";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  refresh.mockClear();
  setVisibility("visible");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setVisibility("visible");
});

describe("RefreshOnPendingPayment", () => {
  it("refreshes the page on every interval tick", () => {
    render(<RefreshOnPendingPayment intervalMs={3000} maxAttempts={30} />);

    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stops refreshing after maxAttempts", () => {
    render(<RefreshOnPendingPayment intervalMs={3000} maxAttempts={2} />);

    vi.advanceTimersByTime(9000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stops refreshing on unmount", () => {
    const { unmount } = render(
      <RefreshOnPendingPayment intervalMs={3000} maxAttempts={30} />,
    );
    unmount();

    vi.advanceTimersByTime(9000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("skips ticks while the tab is hidden", () => {
    render(<RefreshOnPendingPayment intervalMs={3000} maxAttempts={30} />);

    setVisibility("hidden");
    vi.advanceTimersByTime(9000);
    expect(refresh).not.toHaveBeenCalled();

    setVisibility("visible");
    vi.advanceTimersByTime(3000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
