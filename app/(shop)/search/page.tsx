import ProductCard from "@/features/products/components/ProductCard";
import { searchProducts, type SearchSort } from "@/features/products/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sort = (params.sort as SearchSort | undefined) ?? undefined;
  const { products, total } = await searchProducts({ q, sort, category: params.category });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-primary">
        {q ? `Results for "${q}"` : "Search"}
      </h1>
      <p className="mb-6 text-sm text-gray-tertiary">{total} products</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.slug}
            slug={product.slug}
            variantId={product.defaultVariantId}
            title={product.title}
            priceCents={product.priceCents}
            image={product.image}
            description={product.description}
            isPopular={product.isPopular}
          />
        ))}
      </div>
    </div>
  );
}
