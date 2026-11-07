import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/identity/server/guards";
import { getCatalogProduct, listCategories } from "@/features/catalog/server/catalog-service";
import {
  saveProductAction,
  saveVariantAction,
} from "@/features/catalog/server/admin-actions";
import { CATALOG_STATUSES } from "@/features/catalog/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Edit product · Admin" };

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

const fieldClasses =
  "w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Form actions discard the result object; it exists for programmatic callers. */
async function submitProduct(formData: FormData): Promise<void> {
  "use server";
  await saveProductAction(formData);
}

async function submitVariant(formData: FormData): Promise<void> {
  "use server";
  await saveVariantAction(formData);
}

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireAdmin();

  const [product, categories] = await Promise.all([
    getCatalogProduct(id),
    listCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const variant =
    product.variants.find((entry) => entry.isDefault) ?? product.variants[0] ?? null;

  return (
    <main className="grid gap-8">
      <header className="grid gap-2">
        <Link
          href="/admin/products"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Back to catalog
        </Link>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <p className="text-muted-foreground text-sm">
          slug: {product.slug} · status: {statusLabels[product.status] ?? product.status}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitProduct} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={product.id} />

            <div className="grid gap-1.5">
              <label htmlFor="edit-slug" className="text-sm font-medium">
                Slug
              </label>
              <Input
                id="edit-slug"
                name="slug"
                required
                pattern="[a-z0-9-]+"
                defaultValue={product.slug}
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="edit-title" className="text-sm font-medium">
                Title
              </label>
              <Input id="edit-title" name="title" required defaultValue={product.title} />
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="edit-description"
                name="description"
                required
                rows={3}
                defaultValue={product.description}
                className={fieldClasses}
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="edit-category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="edit-category"
                name="categoryId"
                required
                defaultValue={product.categoryId}
                className={fieldClasses}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="edit-status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="edit-status"
                name="status"
                defaultValue={product.status}
                className={fieldClasses}
              >
                {CATALOG_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status] ?? status}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <label htmlFor="edit-images" className="text-sm font-medium">
                Image URLs (one per line)
              </label>
              <textarea
                id="edit-images"
                name="images"
                rows={3}
                defaultValue={product.images.map((image) => image.url).join("\n")}
                className={fieldClasses}
              />
              <p className="text-muted-foreground text-xs">
                Submitting with empty image URLs keeps the existing images;
                listing URLs replaces them in that order. Variants keep their
                price and stock when saved here.
              </p>
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Save product</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {variant && (
        <Card>
          <CardHeader>
            <CardTitle>Default variant ({variant.sku})</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitVariant} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={variant.id} />
              <input type="hidden" name="productId" value={product.id} />

              <div className="grid gap-1.5">
                <label htmlFor="variant-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="variant-name"
                  name="name"
                  placeholder={variant.name}
                  defaultValue={variant.name}
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="variant-price" className="text-sm font-medium">
                  Price (cents)
                </label>
                <Input
                  id="variant-price"
                  name="priceCents"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={variant.priceCents}
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="variant-on-hand" className="text-sm font-medium">
                  On hand
                </label>
                <Input
                  id="variant-on-hand"
                  name="onHand"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={variant.onHand}
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="variant-reserved" className="text-sm font-medium">
                  Reserved
                </label>
                <Input
                  id="variant-reserved"
                  name="reserved"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={variant.reserved}
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit">Save variant</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
