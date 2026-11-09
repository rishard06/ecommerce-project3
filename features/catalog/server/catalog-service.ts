/**
 * Catalog administration service.
 *
 * This layer contains no authorization: every caller (server actions, admin
 * pages) must apply the identity guards first. All money is integer cents and
 * all stock fields are integers.
 *
 * Catalog rows referenced by order history are archived, never hard-deleted.
 */

import type { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { CatalogFilter, ProductInput, VariantInput } from "@/features/catalog/schemas";

/** Default page size for `listCatalogProducts`. */
const DEFAULT_TAKE = 50;
/** Maximum page size; larger values are clamped. */
const MAX_TAKE = 100;

/** Shared include for product reads so list and detail pages get the same shape. */
const productInclude = {
  category: true,
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: [{ isDefault: "desc" }, { id: "asc" }] },
} satisfies Prisma.ProductInclude;

/** A product with its category, ordered images, and variants. */
export type CatalogProduct = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

/** Minimal category summary for admin form selects. */
export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}

/**
 * Lists catalog products for the admin grid with deterministic ordering
 * (updated first, then by id) and simple paging.
 */
export async function listCatalogProducts(
  filter: CatalogFilter = {},
): Promise<CatalogProduct[]> {
  const take = Math.min(Math.max(filter.take ?? DEFAULT_TAKE, 0), MAX_TAKE);
  const skip = Math.max(filter.skip ?? 0, 0);

  return prisma.product.findMany({
    where: {
      ...(filter.search
        ? { title: { contains: filter.search, mode: "insensitive" } }
        : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    },
    include: productInclude,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take,
    skip,
  });
}

/** Loads a single product for the admin detail page. */
export async function getCatalogProduct(id: string): Promise<CatalogProduct | null> {
  return prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
}

/** Category ids/slugs/names ordered by name, for admin form selects. */
export async function listCategories(): Promise<CategorySummary[]> {
  return prisma.category.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Creates a product when no `id` is given, otherwise updates the existing row.
 * Replaces images by position when `images` is provided; variants are never
 * touched here (see {@link ensureDefaultVariant} / {@link updateVariant}).
 */
export async function upsertProduct(
  input: ProductInput,
): Promise<{ productId: string }> {
  const data = {
    slug: input.slug,
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    ...(input.status !== undefined ? { status: input.status } : {}),
  };

  const product = input.id
    ? await prisma.product.update({
        where: { id: input.id },
        data,
      })
    : await prisma.product.create({ data });

  if (input.images !== undefined) {
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    if (input.images.length > 0) {
      await prisma.productImage.createMany({
        data: input.images.map((url, position) => ({
          productId: product.id,
          url,
          position,
        })),
      });
    }
  }

  return { productId: product.id };
}

/**
 * Input for {@link ensureDefaultVariant}. The slug determines a unique SKU
 * (`default-<slug>`) so a repeated call never duplicates the variant.
 */
export interface DefaultVariantInput {
  productId: string;
  slug: string;
  priceCents: number;
  onHand: number;
}

/**
 * Creates the default variant of a new admin-created product, idempotently:
 * an existing variant for the same slug is left untouched.
 */
export async function ensureDefaultVariant(
  input: DefaultVariantInput,
): Promise<void> {
  const sku = `default-${input.slug}`;

  await prisma.productVariant.upsert({
    where: { sku },
    create: {
      productId: input.productId,
      sku,
      name: "Default",
      priceCents: input.priceCents,
      currency: "USD",
      onHand: input.onHand,
      reserved: 0,
      isDefault: true,
    },
    // An existing variant keeps its name, price, and stock levels.
    update: {},
  });
}

/**
 * Updates a variant's price and stock levels (and optionally name/reserved).
 * Unset optional fields stay unchanged: Prisma ignores `undefined` values.
 */
export async function updateVariant(input: VariantInput): Promise<void> {
  await prisma.productVariant.update({
    where: { id: input.id },
    data: {
      name: input.name,
      priceCents: input.priceCents,
      onHand: input.onHand,
      reserved: input.reserved,
    },
  });
}

/**
 * Archives a product by flipping its status. Nothing is hard-deleted: orders
 * keep referencing the product and its variants.
 */
export async function archiveProduct(productId: string): Promise<void> {
  await prisma.product.update({
    where: { id: productId },
    data: { status: "ARCHIVED" },
  });
}
