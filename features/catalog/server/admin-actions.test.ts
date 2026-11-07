import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/identity/server/guards", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/identity/server/guards")>();
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

vi.mock("@/features/catalog/server/catalog-service", () => ({
  listCatalogProducts: vi.fn(),
  getCatalogProduct: vi.fn(),
  listCategories: vi.fn(),
  upsertProduct: vi.fn(),
  ensureDefaultVariant: vi.fn(),
  updateVariant: vi.fn(),
  archiveProduct: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  ForbiddenError,
  UnauthorizedError,
  requireAdmin,
} from "@/features/identity/server/guards";
import {
  archiveProduct,
  ensureDefaultVariant,
  updateVariant,
  upsertProduct,
} from "@/features/catalog/server/catalog-service";
import {
  archiveProductAction,
  saveProductAction,
  saveVariantAction,
} from "./admin-actions";

const requireAdminMock = vi.mocked(requireAdmin);
const upsertProductMock = vi.mocked(upsertProduct);
const ensureDefaultVariantMock = vi.mocked(ensureDefaultVariant);
const updateVariantMock = vi.mocked(updateVariant);
const archiveProductMock = vi.mocked(archiveProduct);
const revalidatePathMock = vi.mocked(revalidatePath);

const ADMIN = { id: "admin-1", email: "admin@example.com", role: "ADMIN" } as const;

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveProductAction", () => {
  it("rejects ANONYMOUS callers before any service call", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    await expect(
      saveProductAction(form({ title: "Sneaky product" })),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(upsertProductMock).not.toHaveBeenCalled();
    expect(ensureDefaultVariantMock).not.toHaveBeenCalled();
  });

  it("rejects CUSTOMER role before any service call", async () => {
    requireAdminMock.mockRejectedValue(new ForbiddenError());

    await expect(
      saveProductAction(
        form({
          slug: "sneaky",
          title: "Sneaky product",
          description: "Nope.",
          categoryId: "cat-1",
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(upsertProductMock).not.toHaveBeenCalled();
  });

  it("requires a valid session before parsing the input", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    await expect(saveProductAction(new FormData())).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects invalid input (bad slug, empty title) without mutating the catalog", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const result = await saveProductAction(
      form({
        slug: "Not A Slug!",
        title: "",
        description: "d",
        categoryId: "cat-1",
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(upsertProductMock).not.toHaveBeenCalled();
  });

  it("persists a new product with a default variant for a valid admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    upsertProductMock.mockResolvedValue({ productId: "p1" });

    const result = await saveProductAction(
      form({
        slug: "dream-desk",
        title: "Dream Desk",
        description: "A desk worth dreaming about.",
        categoryId: "cat-1",
        status: "ACTIVE",
        priceCents: "1299",
        onHand: "8",
        images: "https://cdn/desk-1.jpg\n https://cdn/desk-2.jpg ",
      }),
    );

    expect(upsertProductMock).toHaveBeenCalledWith({
      slug: "dream-desk",
      title: "Dream Desk",
      description: "A desk worth dreaming about.",
      categoryId: "cat-1",
      status: "ACTIVE",
      images: ["https://cdn/desk-1.jpg", "https://cdn/desk-2.jpg"],
    });
    expect(ensureDefaultVariantMock).toHaveBeenCalledWith({
      productId: "p1",
      slug: "dream-desk",
      priceCents: 1299,
      onHand: 8,
    });
    expect(result).toEqual({ success: true, productId: "p1" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/products/p1");
  });

  it("rejects fractional and negative default price/stock without creating anything", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const fractional = await saveProductAction(
      form({
        slug: "dream-desk",
        title: "T",
        description: "D",
        categoryId: "cat-1",
        priceCents: "12.5",
        onHand: "8",
      }),
    );
    const negative = await saveProductAction(
      form({
        slug: "dream-desk",
        title: "T",
        description: "D",
        categoryId: "cat-1",
        priceCents: "1299",
        onHand: "-2",
      }),
    );
    const nonsense = await saveProductAction(
      form({
        slug: "dream-desk",
        title: "T",
        description: "D",
        categoryId: "cat-1",
        priceCents: "twelve",
        onHand: "8",
      }),
    );

    expect(fractional.success).toBe(false);
    expect(negative.success).toBe(false);
    expect(nonsense.success).toBe(false);
    expect(upsertProductMock).not.toHaveBeenCalled();
    expect(ensureDefaultVariantMock).not.toHaveBeenCalled();
  });
});

describe("saveVariantAction", () => {
  it("rejects ANONYMOUS callers before any service call", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    await expect(
      saveVariantAction(form({ id: "v1", priceCents: "1999", onHand: "5" })),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(updateVariantMock).not.toHaveBeenCalled();
  });

  it("rejects CUSTOMER role before any service call", async () => {
    requireAdminMock.mockRejectedValue(new ForbiddenError());

    await expect(
      saveVariantAction(form({ id: "v1", priceCents: "1999", onHand: "5" })),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(updateVariantMock).not.toHaveBeenCalled();
  });

  it("persists variant price and stock for a valid admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const result = await saveVariantAction(
      form({
        id: "v1",
        productId: "p1",
        name: "Walnut top",
        priceCents: "1899",
        onHand: "12",
        reserved: "3",
      }),
    );

    expect(updateVariantMock).toHaveBeenCalledWith({
      id: "v1",
      name: "Walnut top",
      priceCents: 1899,
      onHand: 12,
      reserved: 3,
    });
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/products/p1");
  });

  it("rejects fractional or negative price and stock without mutating", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const fractional = await saveVariantAction(
      form({ id: "v1", priceCents: "12.5", onHand: "5" }),
    );
    const negativeStock = await saveVariantAction(
      form({ id: "v1", priceCents: "1899", onHand: "-1" }),
    );
    const notANumber = await saveVariantAction(
      form({ id: "v1", priceCents: "abc", onHand: "5" }),
    );
    const missing = await saveVariantAction(form({ id: "v1" }));

    expect(fractional.success).toBe(false);
    expect(negativeStock.success).toBe(false);
    expect(notANumber.success).toBe(false);
    expect(missing.success).toBe(false);
    expect(updateVariantMock).not.toHaveBeenCalled();
  });
});

describe("archiveProductAction", () => {
  it("rejects ANONYMOUS callers before any service call", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    await expect(
      archiveProductAction(form({ productId: "p1" })),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(archiveProductMock).not.toHaveBeenCalled();
  });

  it("rejects CUSTOMER role before any service call", async () => {
    requireAdminMock.mockRejectedValue(new ForbiddenError());

    await expect(
      archiveProductAction(form({ productId: "p1" })),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(archiveProductMock).not.toHaveBeenCalled();
  });

  it("delegates to the service and revalidates the catalog", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    archiveProductMock.mockResolvedValue(undefined);

    const result = await archiveProductAction(form({ productId: "p1" }));

    expect(archiveProductMock).toHaveBeenCalledWith("p1");
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/products/p1");
  });

  it("rejects a missing productId without mutating", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const result = await archiveProductAction(form({}));

    expect(result.success).toBe(false);
    expect(archiveProductMock).not.toHaveBeenCalled();
  });
});
