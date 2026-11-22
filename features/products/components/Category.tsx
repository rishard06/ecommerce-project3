import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBagIcon, Watch, Volleyball, Smartphone, ChevronRightIcon } from "lucide-react";
import { getProducts } from "@/lib/products";

interface Category {
  name: string;
  slug: string;
  icon: React.ReactNode;
  color: string;
}

const categories: Category[] = [
  {
    name: "Mobile Accessories",
    slug: "mobile-accessories",
    icon: <ShoppingBagIcon className="size-7" aria-hidden="true" />,
    color: "text-primary-700",
  },
  {
    name: "Watches",
    slug: "mens-watches",
    icon: <Watch className="size-7" aria-hidden="true" />,
    color: "text-primary-600",
  },
  {
    name: "Sports",
    slug: "sports-accessories",
    icon: <Volleyball className="size-7" aria-hidden="true" />,
    color: "text-accent-text",
  },
  {
    name: "Smartphones",
    slug: "smartphones",
    icon: <Smartphone className="size-7" aria-hidden="true" />,
    color: "text-primary-800",
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

export default async function Category() {
  const counts = await Promise.all(
    categories.map((category) => getCategoryCount(category.slug))
  );
  return (
    <section className="w-full px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="mb-3 font-display text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            Shop by category
          </h2>
          <p className="mx-auto max-w-2xl text-gray-secondary">
            A small, considered collection — nothing to scroll past.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {categories.map((category, index) => {
            const count = counts[index];
            return (
              <Link
                key={category.name}
                href={`/products?category=${category.slug}&skip=0`}
                className="rounded-[1.5rem] focus-visible:outline-none"
                aria-label={`Shop ${category.name}`}
              >
                <Card className="glass-component h-full text-center transition-[transform,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:shadow-lift">
                  <CardHeader className="pt-6">
                    <div
                      className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/60 ${category.color}`}
                    >
                      {category.icon}
                    </div>
                    <CardTitle className="text-lg font-semibold tracking-tight text-gray-primary">
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  {count !== null ? (
                    <CardContent>
                      <p className="text-sm text-gray-tertiary">
                        {formatCount(count)}
                      </p>
                    </CardContent>
                  ) : null}
                  <CardFooter className="justify-center pb-6">
                    <span className="flex items-center gap-1 text-sm font-semibold text-accent-text">
                      Shop now
                      <ChevronRightIcon className="size-4" aria-hidden="true" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
