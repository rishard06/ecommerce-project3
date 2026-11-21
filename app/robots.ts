import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/app-url";

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
