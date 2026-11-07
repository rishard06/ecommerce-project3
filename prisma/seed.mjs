/**
 * Seeds the owned catalog from DummyJSON.
 *
 * DummyJSON is import input only — the runtime storefront reads the owned
 * PostgreSQL catalog, never DummyJSON. Idempotent: products/categories are
 * upserted on their stable `dummy-<id>` slugs/SKUs, so running this seed
 * repeatedly updates existing rows instead of duplicating them. Money is
 * integer cents in USD.
 */
import { importDummyCatalog } from "../features/catalog/server/import-dummy-json.ts";
import generatedClient from "../app/generated/prisma/index.js";

const { PrismaClient } = generatedClient;
const prisma = new PrismaClient();

const DUMMYJSON_CATEGORIES_URL = "https://dummyjson.com/products/categories";
const DUMMYJSON_PRODUCTS_URL = "https://dummyjson.com/products?limit=0";

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function main() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    fetchJson(DUMMYJSON_CATEGORIES_URL),
    fetchJson(DUMMYJSON_PRODUCTS_URL),
  ]);

  const categories = Array.isArray(categoriesResponse) ? categoriesResponse : null;
  const products = Array.isArray(productsResponse?.products)
    ? productsResponse.products
    : null;

  if (!categories || categories.length === 0) {
    throw new Error(`Unexpected categories payload from DummyJSON: ${DUMMYJSON_CATEGORIES_URL}`);
  }
  if (!products || products.length === 0) {
    throw new Error(`Unexpected products payload from DummyJSON: ${DUMMYJSON_PRODUCTS_URL}`);
  }

  const { categories: categoryCount, products: productCount } = await importDummyCatalog(
    prisma,
    { categories, products },
  );

  console.log(
    `Seeded ${categoryCount} categories and ${productCount} products from DummyJSON.`,
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
