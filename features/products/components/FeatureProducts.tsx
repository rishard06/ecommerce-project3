import React from "react";
import Link from "next/link";
import { ArrowRight as ArrowRightIcon } from "lucide-react";
import { getFeatureProducts, getProducts } from "@/lib/products";
import ProductCard from "./ProductCard";
import Category from "./Category";
import Features from "@/components/marketing/Features";
import Testimonies from "@/components/marketing/Testimonies";
import DropAlert from "@/components/marketing/DropAlert";

/**
 * Live catalog size for the lime stat tile. A failed query hides the number
 * behind an em dash rather than inventing a figure.
 */
async function getCatalogTotal(): Promise<number | null> {
  try {
    const { total } = await getProducts(undefined, 0, 1);
    return total;
  } catch {
    return null;
  }
}

/**
 * Direction C catalog bento (t1-t6).
 *
 * DOM order is the visual order: t1 occupies the 2x2 bestseller slot, t2/t3
 * fill the first right-hand column, t4 spans the second row, and t5/t6 close
 * the grid. Nothing opts into dense placement, so keyboard order stays true.
 */
export default async function FeatureProducts() {
  const [featureProducts, catalogTotal, rooms] = await Promise.all([
    getFeatureProducts(1),
    getCatalogTotal(),
    Category(),
  ]);
  const [bestseller] = featureProducts;
  const totalLabel =
    catalogTotal === null ? "—" : catalogTotal.toLocaleString("en-US");

  return (
    <section
      id="featured"
      aria-labelledby="featured-heading"
      className="shell scroll-mt-28 py-16 md:py-20"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div>
          <h2
            id="featured-heading"
            className="font-display text-[clamp(2.1rem,4.2vw,3.4rem)] leading-none font-semibold tracking-[-0.035em] text-gray-primary"
          >
            Featured products
          </h2>
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-gray-secondary">
            What people are actually buying right now.
          </p>
        </div>
        <Link
          href="/products"
          className="group inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-xs font-semibold tracking-[0.1em] text-gray-secondary uppercase transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          View all
          <ArrowRightIcon
            data-icon="inline-end"
            className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      </div>

      <div className="bento">
        {bestseller ? (
          <ProductCard
            slug={bestseller.slug}
            variantId={bestseller.defaultVariantId}
            title={bestseller.title}
            priceCents={bestseller.priceCents}
            image={bestseller.image}
            description={bestseller.description}
            isPopular={bestseller.isPopular}
            featured
          />
        ) : null}

        {rooms}

        <article
          data-tile="t3"
          className="bento-card col-span-1 flex flex-col justify-center overflow-clip rounded-[1.25rem] border border-line bg-action p-5 text-action-foreground"
        >
          <h3 className="sr-only">Catalog size</h3>
          <div className="font-display text-[66px] leading-[0.9] tracking-[-0.05em] tabular-nums">
            {totalLabel}
          </div>
        </article>

        <Features />
        <Testimonies tile />
        <DropAlert />
      </div>
    </section>
  );
}
