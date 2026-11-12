import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

function createSeedClient() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("prisma://") || url.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: url }).$extends(withAccelerate());
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
}

const prisma = createSeedClient();

interface DummyProduct {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  stock: number;
  category: string;
  brand?: string;
  sku?: string;
  description?: string;
}

interface DummyResponse {
  products: DummyProduct[];
}

async function main() {
  const response = await fetch("https://dummyjson.com/products?limit=60");

  if (!response.ok) {
    throw new Error(`Failed to fetch DummyJSON products: ${response.status}`);
  }

  const { products } = (await response.json()) as DummyResponse;

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
        stock: product.stock,
        category: product.category,
        brand: product.brand ?? null,
        sku: product.sku ?? null,
        description: product.description ?? null,
      },
      create: {
        id: product.id,
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
        stock: product.stock,
        category: product.category,
        brand: product.brand ?? null,
        sku: product.sku ?? null,
        description: product.description ?? null,
      },
    });
  }

  console.log(`Seeded ${products.length} products from DummyJSON.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
