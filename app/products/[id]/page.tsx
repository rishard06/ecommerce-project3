import { getProduct } from "@/lib/products";
import { ProductDetailPage } from "@/features/products/ProductDetailPage";
import { notFound } from "next/navigation";
import { Product as InternalProduct } from "@/features/products/types";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const product = await getProduct(id);

    if (!product) {
      notFound();
    }

    // Map DummyJSON product to our feature's internal product type
    const mappedProduct: InternalProduct = {
      id: product.id.toString(),
      name: product.title,
      category: product.category,
      price: product.price,
      originalPrice: product.price / (1 - product.discountPercentage / 100),
      description: product.description,
      rating: product.rating,
      reviewCount: product.reviews.length * 124, // Mocking a higher count for visual impact
      images: product.images,
      colors: [
        { name: 'Default', hex: '#1e293b' },
        { name: 'Alternative', hex: '#cbd5e1' }
      ],
      storage: ['128 GB', '256 GB', '512 GB'],
      features: [
        product.warrantyInformation,
        product.shippingInformation,
        product.returnPolicy
      ]
    };

    return <ProductDetailPage product={mappedProduct} />;
  } catch (error) {
    console.error("Error loading product:", error);
    notFound();
  }
}
