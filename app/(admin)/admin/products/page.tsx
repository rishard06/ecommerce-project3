import Link from "next/link";
import { requireAdmin } from "@/features/identity/server/guards";
import {
  listCatalogProducts,
  listCategories,
} from "@/features/catalog/server/catalog-service";
import {
  archiveProductAction,
  saveProductAction,
} from "@/features/catalog/server/admin-actions";
import { CATALOG_STATUSES } from "@/features/catalog/schemas";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Catalog · Admin" };

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ACTIVE" ? "default" : status === "ARCHIVED" ? "outline" : "secondary";

  return <Badge variant={variant}>{statusLabels[status] ?? status}</Badge>;
}

const fieldClasses =
  "w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Form actions discard the result object; it exists for programmatic callers. */
async function submitProduct(formData: FormData): Promise<void> {
  "use server";
  await saveProductAction(formData);
}

async function submitArchive(formData: FormData): Promise<void> {
  "use server";
  await archiveProductAction(formData);
}

export default async function AdminProductsPage() {
  // Defense in depth: the layout already redirected non-admins; the page
  // verifies the role again before touching the catalog.
  await requireAdmin();

  const [products, categories] = await Promise.all([
    listCatalogProducts(),
    listCategories(),
  ]);

  return (
    <main className="grid gap-8">
      <header className="grid gap-1">
        <p className="text-accent-foreground text-xs font-semibold tracking-widest uppercase">
          Admin
        </p>
        <h1 className="text-2xl font-semibold">Product catalog</h1>
        <p className="text-muted-foreground text-sm">
          {products.length} products shown · money is stored as integer cents.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create product</CardTitle>
          <CardDescription>
            Every field is validated server-side; only admins can mutate the
            catalog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitProduct} className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="create-slug" className="text-sm font-medium">
                Slug
              </label>
              <Input
                id="create-slug"
                name="slug"
                required
                pattern="[a-z0-9-]+"
                placeholder="dream-desk"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-title" className="text-sm font-medium">
                Title
              </label>
              <Input id="create-title" name="title" required placeholder="Dream Desk" />
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <label htmlFor="create-description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="create-description"
                name="description"
                required
                rows={3}
                className={fieldClasses}
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-category" className="text-sm font-medium">
                Category
              </label>
              <select id="create-category" name="categoryId" required className={fieldClasses}>
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-status" className="text-sm font-medium">
                Status
              </label>
              <select id="create-status" name="status" defaultValue="ACTIVE" className={fieldClasses}>
                {CATALOG_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status] ?? status}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-price" className="text-sm font-medium">
                Default price (cents)
              </label>
              <Input
                id="create-price"
                name="priceCents"
                type="number"
                min={0}
                step={1}
                placeholder="1999"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="create-on-hand" className="text-sm font-medium">
                Default stock (on hand)
              </label>
              <Input
                id="create-on-hand"
                name="onHand"
                type="number"
                min={0}
                step={1}
                placeholder="25"
              />
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <label htmlFor="create-images" className="text-sm font-medium">
                Image URLs (one per line)
              </label>
              <textarea
                id="create-images"
                name="images"
                rows={3}
                placeholder="https://cdn.example.com/image-1.jpg"
                className={fieldClasses}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Create product</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Archiving keeps order history intact; products are never deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th scope="col" className="py-2 pr-4 font-medium">Product</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Category</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Price</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Stock</th>
                  <th scope="col" className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const variant =
                    product.variants.find((entry) => entry.isDefault) ??
                    product.variants[0];

                  return (
                    <tr key={product.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{product.title}</div>
                        <div className="text-muted-foreground">{product.slug}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="text-muted-foreground py-3 pr-4">
                        {product.category.name}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {variant ? formatCents(variant.priceCents) : "—"}
                      </td>
                      <td className="text-muted-foreground py-3 pr-4 tabular-nums">
                        {variant
                          ? `${variant.onHand} on hand · ${variant.reserved} reserved`
                          : "no variant"}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/products/${product.id}`}>Edit</Link>
                          </Button>
                          <form action={submitArchive}>
                            <input type="hidden" name="productId" value={product.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              Archive
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No products match.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
