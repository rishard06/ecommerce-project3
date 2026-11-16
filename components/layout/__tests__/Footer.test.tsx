// @vitest-environment jsdom
import { readdirSync } from "node:fs";
import path from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Footer from "../Footer";

afterEach(cleanup);

/**
 * External footer links must use https on a real-looking host. Paths, queries,
 * and fragments are allowed: social links may point at brand profiles such as
 * `https://facebook.com/vennshop`.
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
    expect("https://facebook.com/vennshop").toMatch(EXTERNAL_PROFILE_URL);
    expect("https://www.instagram.com/venn.shop/").toMatch(
      EXTERNAL_PROFILE_URL,
    );
  });
});
