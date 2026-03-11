import { Product } from "@/types";

export interface Category {
  slug: string;
  name: string;
  url: string;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Fetches all product categories from DummyJSON.
 */
export async function getCategories(): Promise<Category[]> {
  const res = await fetch("https://dummyjson.com/products/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

/**
 * Fetches products with optional category filtering and pagination.
 */
export async function getProducts(
  category?: string,
  skip: number = 0,
  limit: number = 20
): Promise<ProductResponse> {
  const baseUrl = category
    ? `https://dummyjson.com/products/category/${category}`
    : "https://dummyjson.com/products";
  
  const res = await fetch(`${baseUrl}?limit=${limit}&skip=${skip}`, {
    next: { revalidate: 3600 },
  });
  
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

/**
 * Fetches a single product by ID.
 */
export async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`https://dummyjson.com/products/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch product with id: ${id}`);
  return res.json();
}

/**
 * Fetches specific featured products.
 */
export async function getFeatureProducts(): Promise<Product[]> {
  const productIds = [78, 99, 94, 123];
  const urls = productIds.map((id) => `https://dummyjson.com/products/${id}`);

  try {
    const responses = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          next: { revalidate: 3600 },
        }),
      ),
    );

    const data = await Promise.all(
      responses.map(async (res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      }),
    );

    return data as Product[];
  } catch (error) {
    console.error("Failed to fetch featured products:", error);
    return [];
  }
}
