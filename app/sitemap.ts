import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

/**
 * The catalog changes independently of deploys, and the build environment is
 * not guaranteed to have database access, so the sitemap renders per request
 * instead of being frozen at build time.
 */

/**
 * Public routes: the home page, the catalog index, and every sellable product
 * (ACTIVE with at least one variant — the same rule the storefront reads use).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Stay request-time: the catalog changes independently of deploys.
  await connection();
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", variants: { some: {} } },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });

  const base = siteUrl();
  const now = new Date();

  return [
    { url: base, lastModified: now },
    { url: `${base}/products`, lastModified: now },
    ...products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      lastModified: product.updatedAt,
    })),
  ];
}
