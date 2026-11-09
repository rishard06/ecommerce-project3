/**
 * DummyJSON import mapper and idempotent catalog import.
 *
 * DummyJSON is import input only: this module is consumed by the seed script
 * (`prisma/seed.mjs`) at seed time, never by the runtime storefront.
 *
 * All money is integer cents (USD). Identifiers are stable (`dummy-<id>` for
 * both product slug and variant SKU) so repeated imports update existing rows
 * instead of creating duplicates.
 */

/** A category from https://dummyjson.com/products/categories. */
export interface DummyCategory {
  slug: string;
  name: string;
}

/** A review from https://dummyjson.com/products (subset we consume). */
export interface DummyReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  /** Present in the source payload; not consumed. */
  reviewerEmail?: string;
}

/** A product from https://dummyjson.com/products (subset we consume). */
export interface DummyProduct {
  id: number;
  title: string;
  description: string;
  /** Category slug, e.g. "electronics". */
  category: string;
  /** Dollar price, e.g. 19.99. */
  price: number;
  brand?: string | null;
  images?: string[];
  /** Aggregate rating 0–5; defaults to 0 when the source omits it. */
  rating?: number | null;
  reviews?: DummyReview[] | null;
  warrantyInformation?: string | null;
  shippingInformation?: string | null;
  returnPolicy?: string | null;
}

/** Review shape persisted on `Product.reviews` (raw seed values, no parsing). */
export interface CatalogReviewSeed {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
}

/** Normalized seed product ready to be upserted into the owned catalog. */
export interface CatalogSeedProduct {
  /** Stable slug: `dummy-<id>`. */
  slug: string;
  /** Stable SKU: `dummy-<id>`. */
  sku: string;
  title: string;
  description: string;
  /** Present only when the source has a non-empty brand. */
  brand?: string;
  categorySlug: string;
  /** Source dollar price converted to integer cents. */
  priceCents: number;
  currency: string;
  onHand: number;
  reserved: number;
  /** Ordered image URLs, positions are their array indices. */
  images: string[];
  /** Aggregate rating 0–5 (default 0). */
  rating: number;
  /** Raw seed reviews; empty when the source has none. */
  reviews: CatalogReviewSeed[];
  /** Non-empty policy strings: warranty, shipping, return policy. */
  features: string[];
}

/** Product create/update payloads used through {@link CatalogImportTx}. */
export interface CatalogProductSeed {
  slug: string;
  title: string;
  description: string;
  brand: string | null;
  status: "ACTIVE";
  categoryId: string;
  rating: number;
  reviews: CatalogReviewSeed[];
  features: string[];
}

export interface CatalogProductUpdate {
  title: string;
  description: string;
  brand: string | null;
  categoryId: string;
  rating: number;
  reviews: CatalogReviewSeed[];
  features: string[];
}

export interface CatalogVariantSeed {
  sku: string;
  name: string;
  priceCents: number;
  currency: string;
  onHand: number;
  reserved: number;
  isDefault: boolean;
  productId: string;
}

export interface CatalogVariantUpdate {
  name: string;
  priceCents: number;
  currency: string;
  onHand: number;
  reserved: number;
}

export interface CatalogImageSeed {
  productId: string;
  url: string;
  position: number;
}

/**
 * Narrow structural interface implemented by PrismaClient (via its delegate
 * models) and faked in tests.
 */
export interface CatalogImportTx {
  category: {
    upsert(args: {
      where: { slug: string };
      create: { slug: string; name: string };
      update: { name?: string };
    }): Promise<{ id: string; slug: string }>;
  };
  product: {
    upsert(args: {
      where: { slug: string };
      create: CatalogProductSeed;
      update: CatalogProductUpdate;
    }): Promise<{ id: string; slug: string }>;
  };
  productImage: {
    deleteMany(args: { where: { productId: string } }): Promise<unknown>;
    createMany(args: {
      data: CatalogImageSeed[];
    }): Promise<unknown>;
  };
  productVariant: {
    upsert(args: {
      where: { sku: string };
      create: CatalogVariantSeed;
      update: CatalogVariantUpdate;
    }): Promise<{ sku: string }>;
  };
}

export interface CatalogImportClient {
  $transaction<T>(work: (tx: CatalogImportTx) => Promise<T>): Promise<T>;
}

/** Default stock for development data imported from DummyJSON. */
const SEED_ON_HAND = 25;
const SEED_RESERVED = 0;
const DEFAULT_VARIANT_NAME = "Default";
const SEED_CURRENCY = "USD";
const SEED_PRODUCT_STATUS: "ACTIVE" = "ACTIVE";

/**
 * Pure mapper from a DummyJSON product to a normalized seed product.
 * Deterministic: no dates, randomness, or environment reads, so repeated
 * mappings are byte-identical. Review dates stay raw source strings; the
 * storefront view layer formats them for display.
 */
export function mapDummyProduct(input: DummyProduct): CatalogSeedProduct {
  const slug = `dummy-${input.id}`;
  const images = Array.isArray(input.images)
    ? input.images.filter((url): url is string => Boolean(url))
    : [];
  const reviews = (Array.isArray(input.reviews) ? input.reviews : []).map((review) => ({
    rating: review.rating,
    comment: review.comment,
    date: review.date,
    reviewerName: review.reviewerName,
  }));
  const features = [
    input.warrantyInformation,
    input.shippingInformation,
    input.returnPolicy,
  ].filter((value): value is string => Boolean(value));

  return {
    slug,
    sku: slug,
    title: input.title,
    description: input.description,
    ...(input.brand ? { brand: input.brand } : {}),
    categorySlug: input.category,
    priceCents: Math.round(input.price * 100),
    currency: SEED_CURRENCY,
    onHand: SEED_ON_HAND,
    reserved: SEED_RESERVED,
    images,
    rating: input.rating ?? 0,
    reviews,
    features,
  };
}

/**
 * Idempotently import DummyJSON categories + products into the owned catalog
 * (inside a single transaction):
 * - categories upserted on `Category.slug`;
 * - products upserted on `Product.slug`, with status ACTIVE on create only
 *   (existing products keep their DB status);
 * - images replaced on every run (deleteMany, then createMany by position);
 * - the default variant upserted on `ProductVariant.sku`;
 * - rating/reviews/features refreshed from the seed payload on every run.
 *
 * Returns the number of categories and products processed.
 */
export async function importDummyCatalog(
  client: CatalogImportClient,
  data: { categories: DummyCategory[]; products: DummyProduct[] },
): Promise<{ categories: number; products: number }> {
  const categories = data.categories;
  const products = data.products;

  return client.$transaction(async (tx) => {
    const categoryIds = new Map<string, { id: string; slug: string }>();
    for (const category of categories) {
      categoryIds.set(
        category.slug,
        await tx.category.upsert({
          where: { slug: category.slug },
          create: { slug: category.slug, name: category.name },
          update: { name: category.name },
        }),
      );
    }

    for (const product of products) {
      const seed = mapDummyProduct(product);
      const category =
        categoryIds.get(seed.categorySlug) ??
        (await tx.category.upsert({
          where: { slug: seed.categorySlug },
          // Provisional name on create: a slug can carry no display name on its own.
          create: { slug: seed.categorySlug, name: seed.categorySlug },
          // Non-destructive on update: never overwrite a managed category name
          // when the import payload does not define this category.
          update: {},
        }));
      categoryIds.set(seed.categorySlug, category);

      const dbProduct = await tx.product.upsert({
        where: { slug: seed.slug },
        create: {
          slug: seed.slug,
          title: seed.title,
          description: seed.description,
          brand: seed.brand ?? null,
          status: SEED_PRODUCT_STATUS,
          categoryId: category.id,
          rating: seed.rating,
          reviews: seed.reviews,
          features: seed.features,
        },
        // Existing products keep their DB status; only business fields refresh.
        update: {
          title: seed.title,
          description: seed.description,
          brand: seed.brand ?? null,
          categoryId: category.id,
          rating: seed.rating,
          reviews: seed.reviews,
          features: seed.features,
        },
      });

      // Replace images on every run so repeated imports do not duplicate them.
      await tx.productImage.deleteMany({ where: { productId: dbProduct.id } });
      if (seed.images.length > 0) {
        await tx.productImage.createMany({
          data: seed.images.map((url, position) => ({
            productId: dbProduct.id,
            url,
            position,
          })),
        });
      }

      await tx.productVariant.upsert({
        where: { sku: seed.sku },
        create: {
          sku: seed.sku,
          name: DEFAULT_VARIANT_NAME,
          priceCents: seed.priceCents,
          currency: seed.currency,
          onHand: seed.onHand,
          reserved: seed.reserved,
          isDefault: true,
          productId: dbProduct.id,
        },
        update: {
          name: DEFAULT_VARIANT_NAME,
          priceCents: seed.priceCents,
          currency: seed.currency,
          onHand: seed.onHand,
          reserved: seed.reserved,
        },
      });
    }

    return { categories: categories.length, products: products.length };
  });
}
