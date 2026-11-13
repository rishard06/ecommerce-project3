import { redirect } from "next/navigation";

/**
 * The catalog listing lives at `/products`; keep old `/search` links working
 * by forwarding their filters there instead of maintaining a second listing.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.sort) query.set("sort", params.sort);
  if (params.category) query.set("category", params.category);

  const suffix = query.toString();
  redirect(suffix ? `/products?${suffix}` : "/products");
}
