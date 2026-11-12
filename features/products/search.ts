import { prisma } from "@/lib/prisma";

export type SearchSort = "price-asc" | "price-desc" | "newest";

export interface SearchParams {
  q?: string;
  sort?: SearchSort;
  category?: string;
  skip?: number;
  limit?: number;
}

export async function searchProducts({ q, sort, category, skip = 0, limit = 20 }: SearchParams) {
  try {
    const where: { title?: { contains: string; mode: "insensitive" }; category?: string } = {};
    if (q) where.title = { contains: q, mode: "insensitive" };
    if (category) where.category = category;
    const orderBy =
      sort === "price-asc"
        ? { price: "asc" as const }
        : sort === "price-desc"
          ? { price: "desc" as const }
          : { id: "asc" as const };
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: limit }),
      prisma.product.count({ where }),
    ]);
    return { products, total };
  } catch {
    const res = await fetch(`https://dummyjson.com/products/search?q=${encodeURIComponent(q ?? "")}&limit=${limit}&skip=${skip}`);
    const data = await res.json();
    return { products: data.products ?? [], total: data.total ?? 0 };
  }
}
