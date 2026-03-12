import { getProduct, getProducts } from "@/lib/products";
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

    // Fetch related products from the same category
    const relatedResponse = await getProducts(product.category, 0, 5);
    const relatedProducts = relatedResponse.products
      .filter(p => p.id.toString() !== id)
      .slice(0, 4)
      .map(p => ({
        id: p.id.toString(),
        name: p.title,
        price: p.price,
        images: p.images,
        description: p.description,
        category: p.category,
        rating: p.rating,
        reviewCount: p.reviews.length,
        features: [p.warrantyInformation, p.shippingInformation],
        reviews: [] // Not needed for the card
      }));

    // Map DummyJSON product to our feature's internal product type
    const mappedProduct: InternalProduct = {
      id: product.id.toString(),
      name: product.title,
      category: product.category,
      price: product.price,
      originalPrice: product.price / (1 - product.discountPercentage / 100),
      description: product.description,
      rating: product.rating,
      reviewCount: product.reviews.length,
      images: product.images,
      // Conditionally mock variants only for specific categories if not provided by API
      colors: ['laptops', 'smartphones', 'tablets'].includes(product.category) ? [
        { name: 'Silver', hex: '#cbd5e1' },
        { name: 'Space Gray', hex: '#1e293b' }
      ] : undefined,
      storage: ['laptops', 'smartphones', 'tablets'].includes(product.category) ? 
        ['128 GB', '256 GB', '512 GB'] : undefined,
      features: [
        product.warrantyInformation,
        product.shippingInformation,
        product.returnPolicy
      ],
      reviews: product.reviews.map((r, index) => ({
        id: `rev-${index}`,
        userName: r.reviewerName,
        rating: r.rating,
        date: new Date(r.date).toLocaleDateString(),
        title: r.rating >= 4 ? "Great Product" : "Feedback",
        content: r.comment,
        helpfulCount: Math.floor(Math.random() * 50)
      }))
    };

    return <ProductDetailPage product={mappedProduct} relatedProducts={relatedProducts} />;
  } catch (error) {
    console.error("Error loading product:", error);
    notFound();
  }
}
