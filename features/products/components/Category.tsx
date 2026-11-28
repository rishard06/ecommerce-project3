import Link from "next/link";
import {
  ArrowUpRight,
  ShoppingBagIcon,
  Smartphone,
  Volleyball,
  Watch,
  type LucideIcon,
} from "lucide-react";
import { getProducts } from "@/lib/products";

interface Category {
  name: string;
  slug: string;
  icon: LucideIcon;
}

const categories: Category[] = [
  {
    name: "Mobile Accessories",
    slug: "mobile-accessories",
    icon: ShoppingBagIcon,
  },
  {
    name: "Watches",
    slug: "mens-watches",
    icon: Watch,
  },
  {
    name: "Sports",
    slug: "sports-accessories",
    icon: Volleyball,
  },
  {
    name: "Smartphones",
    slug: "smartphones",
    icon: Smartphone,
  },
];

/**
 * Live catalog count for one category. A failed query hides the count
 * rather than showing a stale number.
 */
async function getCategoryCount(slug: string): Promise<number | null> {
  try {
    const { total } = await getProducts(slug, 0, 1);
    return total;
  } catch {
    return null;
  }
}

function formatCount(count: number): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "product" : "products"}`;
}

/**
 * Catalog bento tile t2: live catalog rooms.
 *
 * Every room is a real link with a 44px hit area. The compact number is
 * decorative; the full "12 products" phrase sits in an sr-only span so the
 * link still reads naturally without turning the tile into a paragraph.
 */
export default async function Category() {
  const counts = await Promise.all(
    categories.map((category) => getCategoryCount(category.slug)),
  );

  return (
    <article
      data-tile="t2"
      className="bento-card col-span-1 flex flex-col justify-between gap-2.5 overflow-clip rounded-[1.25rem] border border-line bg-panel p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="bento-card__title font-display font-semibold tracking-[-0.02em] text-gray-primary">
            Shop by category
          </h3>
          <p className="mt-1 text-[11px] leading-snug text-gray-tertiary">
            A small, considered collection — nothing to scroll past.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-gray-secondary"
        >
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-4">
        {categories.map((category, index) => {
          const count = counts[index];
          const Icon = category.icon;

          return (
            <li key={category.name}>
              <Link
                href={`/products?category=${category.slug}&skip=0`}
                aria-label={
                  count !== null
                    ? `Shop ${category.name}, ${formatCount(count)}`
                    : `Shop ${category.name}`
                }
                className="flex min-h-11 cursor-pointer items-center justify-between gap-1.5 border-t border-line py-1 text-xs text-gray-secondary transition-colors hover:text-accent-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 text-[11px] leading-tight">
                    {category.name}
                  </span>
                </span>
                {count !== null ? (
                  <span className="flex flex-col items-end">
                    <span
                      aria-hidden="true"
                      className="text-[11px] tabular-nums text-gray-tertiary"
                    >
                      {count}
                    </span>
                    <span className="sr-only">{formatCount(count)}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
