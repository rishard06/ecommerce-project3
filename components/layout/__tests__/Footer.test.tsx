// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Footer from "../Footer";

afterEach(cleanup);

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function typeEmail(value = "reader@example.com") {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value },
  });
}

function submitNewsletterForm(container: HTMLElement) {
  const form = container.querySelector("form");
  expect(form).toBeTruthy();
  fireEvent.submit(form as HTMLFormElement);
}

describe("Footer newsletter", () => {
  it("disables the form and shows a spinner while subscribing", async () => {
    const pending = deferred();
    const onSubscribe = vi.fn(() => pending.promise);
    const { container } = render(<Footer onSubscribe={onSubscribe} />);

    typeEmail();
    submitNewsletterForm(container);

    const button = screen.getByRole("button", {
      name: /subscribe to newsletter/i,
    }) as HTMLButtonElement;

    expect(onSubscribe).toHaveBeenCalledWith("reader@example.com");
    expect(button.disabled).toBe(true);
    expect(
      (screen.getByLabelText(/email address/i) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(container.querySelector(".animate-spin")).toBeTruthy();

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });

    expect(screen.getByText(/you're on the list/i)).toBeTruthy();
    expect(container.querySelector(".lucide-check")).toBeTruthy();
  });

  it("shows an inline alert and re-enables the form when subscribing fails", async () => {
    const onSubscribe = vi.fn().mockRejectedValue(new Error("offline"));
    const { container } = render(<Footer onSubscribe={onSubscribe} />);

    typeEmail();
    submitNewsletterForm(container);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/try again/i);

    const button = screen.getByRole("button", {
      name: /subscribe to newsletter/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(container.querySelector("form")).toBeTruthy();
    expect((screen.getByLabelText(/email address/i) as HTMLInputElement).value).toBe(
      "reader@example.com",
    );
  });
});

describe("Footer links", () => {
  it('renders no placeholder "#" hrefs', () => {
    const { container } = render(<Footer />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((anchor) =>
      anchor.getAttribute("href"),
    );

    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs).not.toContain("#");
  });
});
