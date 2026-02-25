import type { Product } from "@/types";

/**
 * Fetches featured products from DummyJSON API in parallel.
 * @returns A promise that resolves to an array of Products.
 */
export default async function getFeatureProducts(): Promise<Product[]> {
  const productIds = [78, 99, 94, 123];
  const urls = productIds.map(id => `https://dummyjson.com/products/${id}`);

  try {
    const responses = await Promise.all(
      urls.map(url =>
        fetch(url, {
          next: { revalidate: 3600 }, // Cache for 1 hour (Next.js specific)
        })
      )
    );

    const data = await Promise.all(
      responses.map(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
    );

    return data as Product[];
  } catch (error) {
    console.error("Failed to fetch featured products:", error);
    return []; // Return empty array on failure to prevent crashing
  }
}
