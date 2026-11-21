import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Task 07: the root layout keeps the existing title template and description
 * verbatim while adding the social-share surface (metadataBase/openGraph/
 * twitter). The base URL comes from NEXT_PUBLIC_APP_URL, never a hardcoded
 * production domain.
 */

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
  Fraunces: () => ({ variable: "--font-fraunces" }),
}));

// The layout imports the global stylesheet; Vitest would otherwise run it
// through the app's PostCSS/Tailwind pipeline.
vi.mock("./globals.css", () => ({}));

const DESCRIPTION =
  "A calm, considered shop for everyday essentials — clear pricing, fast delivery, honest reviews, easy returns, and a checkout that gets out of your way.";

async function loadMetadata() {
  vi.resetModules();
  const layout = await import("./layout");
  return layout.metadata;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("root layout metadata", () => {
  it("keeps the existing title template and description verbatim", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example/");

    const metadata = await loadMetadata();

    expect(metadata.title).toEqual({
      default: "tended. — Considered essentials",
      template: "%s | tended.",
    });
    expect(metadata.description).toBe(DESCRIPTION);
    expect(metadata.applicationName).toBe("tended.");
  });

  it("derives metadataBase from NEXT_PUBLIC_APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example/");

    const metadata = await loadMetadata();

    expect(metadata.metadataBase?.toString()).toBe("https://shop.example/");
  });

  it("adds Open Graph and Twitter card metadata", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example/");

    const metadata = await loadMetadata();

    expect(metadata.openGraph).toMatchObject({
      type: "website",
      siteName: "tended.",
      title: "tended. — Considered essentials",
      description: DESCRIPTION,
      url: "/",
    });
    expect(metadata.openGraph?.images).toEqual([
      { url: "/landing/craft.webp", alt: "tended. — Considered essentials" },
    ]);
    expect(metadata.twitter).toEqual({
      card: "summary_large_image",
      title: "tended. — Considered essentials",
      description: DESCRIPTION,
      images: ["/landing/craft.webp"],
    });
  });

  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);

    const metadata = await loadMetadata();

    expect(metadata.metadataBase?.toString()).toBe("http://localhost:3000/");
  });
});
