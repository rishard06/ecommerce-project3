import { getProduct, getRelatedProducts } from "@/lib/products";
import { siteUrl } from "@/lib/app-url";
import { ProductDetailPage } from "@/features/products/ProductDetailPage";
import { notFound } from "next/navigation";
import { Product as InternalProduct } from "@/features/products/types";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // The URL carries the product slug (the folder keeps its historical name).
  const { id: slug } = await params;

  // Detail and related cards are independent cached reads: the related query
  // resolves the category from the slug itself, so neither waits on the other.
  const [product, relatedResponse] = await Promise.all([
    getProduct(slug),
    getRelatedProducts(slug, 5),
  ]);

  if (!product) {
    notFound();
  }

  // Related products from the same category, excluding the current product.
  const relatedProducts: Partial<InternalProduct>[] = relatedResponse.products
    .filter((p) => p.slug !== slug)
    .slice(0, 4)
    .map((p) => ({
      id: p.slug,
      name: p.title,
      priceCents: p.priceCents,
      defaultVariantId: p.defaultVariantId,
      images: [p.image],
      description: p.description,
    }));

  // Map the catalog view onto the feature's internal product type.
  const hasVariantOptions = ["laptops", "smartphones", "tablets"].includes(
    product.categorySlug
  );
  const mappedProduct: InternalProduct = {
    id: product.slug,
    name: product.title,
    category: product.categorySlug,
    categoryName: product.categoryName,
    priceCents: product.priceCents,
    defaultVariantId: product.defaultVariantId,
    description: product.description,
    rating: product.rating,
    reviewCount: product.reviewCount,
    images: product.images,
    // Decorative variant pickers for device-shaped categories (unchanged design).
    colors: hasVariantOptions
      ? [
          { name: "Silver", hex: "#cbd5e1" },
          { name: "Space Gray", hex: "#1e293b" },
        ]
      : undefined,
    storage: hasVariantOptions ? ["128 GB", "256 GB", "512 GB"] : undefined,
    features: product.features,
    reviews: product.reviews,
  };

  // schema.org Product for rich results: price + availability come from the
  // same product/variant data the page already fetched.
  const base = siteUrl();
  const productJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((image) => new URL(image, base).toString()),
    sku: product.defaultVariant.sku,
    offers: {
      "@type": "Offer",
      url: `${base}/products/${product.slug}`,
      priceCurrency: "USD",
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.defaultVariant.onHand > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  }).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        // Derived from the product already fetched above — no extra query.
        // `<` is escaped so catalog copy can never close the script tag.
        dangerouslySetInnerHTML={{ __html: productJsonLd }}
      />
      <ProductDetailPage product={mappedProduct} relatedProducts={relatedProducts} />
    </>
  );
}
