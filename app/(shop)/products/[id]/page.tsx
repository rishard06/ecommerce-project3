import { getProduct, getProducts } from "@/lib/products";
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

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // Related products from the same category, excluding the current product.
  const relatedResponse = await getProducts(product.categorySlug, 0, 5);
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

  return <ProductDetailPage product={mappedProduct} relatedProducts={relatedProducts} />;
}
