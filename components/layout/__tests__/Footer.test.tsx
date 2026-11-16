// @vitest-environment jsdom
import { readdirSync } from "node:fs";
import path from "node:path";
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

/**
 * External footer links must use https on a real-looking host. Paths, queries,
 * and fragments are allowed: social links may point at brand profiles such as
 * `https://facebook.com/tendedshop`.
 */
const EXTERNAL_PROFILE_URL = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:[/?#]\S*)?$/i;

/**
 * Every in-app footer destination must resolve to a real Next.js route, so we
 * derive the allowlist from the filesystem instead of hardcoding it:
 * `app/(group)/path/page.tsx` becomes `/path`, and `app/(group)/page.tsx`
 * becomes `/`. Route groups are not part of the URL.
 */
function appRoutes(): Set<string> {
  const routes = new Set<string>();
  const appDir = path.join(process.cwd(), "app");

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === "page.tsx") {
        const segments = path
          .relative(appDir, dir)
          .split(path.sep)
          .filter((segment) => segment && !/^\(.*\)$/.test(segment));
        routes.add(segments.length > 0 ? `/${segments.join("/")}` : "/");
      }
    }
  };

  walk(appDir);
  return routes;
}

function footerHrefs(): string[] {
  const { container } = render(<Footer />);
  return Array.from(container.querySelectorAll("a")).map(
    (anchor) => anchor.getAttribute("href") ?? "",
  );
}

describe("Footer links", () => {
  it("renders links", () => {
    expect(footerHrefs().length).toBeGreaterThan(0);
  });

  it('uses no placeholder "#" hrefs', () => {
    expect(footerHrefs()).not.toContain("#");
  });

  it("points every internal link at an existing app/ route", () => {
    const routes = appRoutes();
    const internalHrefs = footerHrefs().filter((href) => href.startsWith("/"));

    expect(internalHrefs.length).toBeGreaterThan(0);
    for (const href of internalHrefs) {
      expect(routes.has(href), `${href} should resolve to an app/ page`).toBe(
        true,
      );
    }
  });

  it("points every external link at a real https destination", () => {
    const externalHrefs = footerHrefs().filter((href) =>
      href.startsWith("http"),
    );

    for (const href of externalHrefs) {
      expect(href).toMatch(EXTERNAL_PROFILE_URL);
    }
  });

  it("accepts brand profile URLs with paths", () => {
    // The owner TODO will replace platform homepages with profile URLs such as
    // this one, so the gate must not reject a valid path.
    expect("https://facebook.com/tendedshop").toMatch(EXTERNAL_PROFILE_URL);
    expect("https://www.instagram.com/tended.shop/").toMatch(
      EXTERNAL_PROFILE_URL,
    );
  });
});
