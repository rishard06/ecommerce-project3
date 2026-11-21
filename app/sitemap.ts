import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const DEFAULT_APP_URL = "http://localhost:3000";

/**
 * The catalog changes independently of deploys, and the build environment is
 * not guaranteed to have database access, so the sitemap renders per request
 * instead of being frozen at build time.
 */
export const dynamic = "force-dynamic";

function siteUrl(): string {
  return (getPublicEnv().NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(/\/$/, "");
}

/**
 * Public routes: the home page, the catalog index, and every sellable product
 * (ACTIVE with at least one variant — the same rule the storefront reads use).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
