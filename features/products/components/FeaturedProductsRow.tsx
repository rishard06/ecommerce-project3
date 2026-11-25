import type { StorefrontProductSummary } from "@/features/catalog/server/catalog-view";
import ProductCard from "./ProductCard";

const HEADING_ID = "products-featured-heading";

/**
 * "You may also like" rail above the /products grid.
 *
 * Native horizontal scroll: no carousel state, no client component, so the row
 * ships zero JavaScript of its own. Cards are the grid's own ProductCard, which
 * keeps the Popular badge, add-to-cart, and favorites behaviour identical.
 * The label is deliberately distinct from the landing carousel's "Product
 * highlights" so the two regions are distinguishable to assistive tech.
 */
export default function FeaturedProductsRow({
  products,
}: {
  products: StorefrontProductSummary[];
}) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mb-9 border-b border-border/60 pb-7"
    >
      <div className="mb-4">
        <h2
          id={HEADING_ID}
          className="text-lg font-semibold tracking-tight text-gray-primary md:text-xl"
        >
          You may also like
        </h2>
        <p className="mt-1 text-sm text-gray-tertiary">
          Top-rated picks from the catalog.
        </p>
      </div>

      {/* role="list" restores list semantics that flex layout drops in Safari. */}
      <ul
        role="list"
        className="custom-scrollbar -mx-2 -my-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 py-2"
      >
        {products.map((product) => (
          <li key={product.slug} className="w-64 shrink-0 snap-start sm:w-72">
            <ProductCard
              slug={product.slug}
              variantId={product.defaultVariantId}
              title={product.title}
              priceCents={product.priceCents}
              image={product.image}
              description={product.description}
              isPopular={product.isPopular}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
