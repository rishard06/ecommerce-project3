import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/lib/env";

const DEFAULT_APP_URL = "http://localhost:3000";

function siteUrl(): string {
  return (getPublicEnv().NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(/\/$/, "");
}

/**
 * Crawlers may index every public route; the sitemap pointer is absolute and
 * derived from the configured app URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
