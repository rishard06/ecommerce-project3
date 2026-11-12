import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCartPrices } from '../price-validation';
import { prisma } from '@/lib/prisma';

// Mock the Prisma client so tests never touch a real database.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
  },
}));

type TestProduct = {
  id: number;
  title: string;
  price: number;
  stock: number;
};

const findMany = vi.mocked(prisma.product.findMany);

function mockProducts(products: TestProduct[]) {
  findMany.mockResolvedValue(products as any);
}

describe('validateCartPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should validate a single item using the DB price', async () => {
      mockProducts([
        { id: 1, title: 'Test Product', price: 99.99, stock: 10 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: 2 }]);

      expect(result.success).toBe(true);
      expect(result.validatedItems).toHaveLength(1);
      expect(result.validatedItems![0]).toEqual({
        id: 1,
        title: 'Test Product',
        price: 99.99,
        quantity: 2,
      });
      expect(result.subtotal).toBeCloseTo(199.98, 2); // 99.99 * 2
      expect(result.tax).toBeCloseTo(2.9997, 2); // 199.98 * 0.015
      expect(result.total).toBeCloseTo(202.9797, 2); // free standard shipping
    });

    it('should batch-fetch products and calculate correct totals', async () => {
      mockProducts([
        { id: 1, title: 'Product A', price: 50.0, stock: 10 },
        { id: 2, title: 'Product B', price: 30.0, stock: 10 },
      ]);

      const result = await validateCartPrices([
        { id: 1, quantity: 2 },
        { id: 2, quantity: 1 },
      ]);

      expect(result.success).toBe(true);
      expect(result.validatedItems).toHaveLength(2);
      expect(result.subtotal).toBeCloseTo(130.0, 2); // (50*2) + (30*1)
      expect(result.tax).toBeCloseTo(1.95, 2); // 130 * 0.015
      expect(result.total).toBeCloseTo(131.95, 2); // free standard shipping
      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        select: { id: true, title: true, price: true, stock: true },
      });
    });

    it('should include standard shipping below the free-shipping threshold', async () => {
      mockProducts([{ id: 5, title: 'Bulk Item', price: 10.0, stock: 20 }]);

      const result = await validateCartPrices([{ id: 5, quantity: 1 }]);

      expect(result.success).toBe(true);
      expect(result.subtotal).toBeCloseTo(10.0, 2);
      expect(result.tax).toBeCloseTo(0.15, 2);
      expect(result.total).toBeCloseTo(15.14, 2); // 10 + 4.99 + 0.15
    });

    it('should handle products with decimal prices', async () => {
      mockProducts([
        { id: 1, title: 'Decimal Price', price: 9.99, stock: 10 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: 3 }]);

      expect(result.success).toBe(true);
      expect(result.subtotal).toBeCloseTo(29.97, 2);
      expect(result.tax).toBeCloseTo(0.44955, 2);
      expect(result.total).toBeCloseTo(35.40955, 2); // + 4.99 shipping
    });
  });

  describe('Quantity validation', () => {
    it('should reject an empty cart', async () => {
      const result = await validateCartPrices([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cart is empty');
      expect(findMany).not.toHaveBeenCalled();
    });

    it('should reject quantity 0', async () => {
      mockProducts([
        { id: 1, title: 'Test Product', price: 10.0, stock: 10 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: 0 }]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid quantity for product ID 1');
    });

    it('should reject a negative quantity', async () => {
      mockProducts([
        { id: 1, title: 'Test Product', price: 10.0, stock: 10 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: -1 }]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 99');
    });

    it('should reject quantity above 99', async () => {
      mockProducts([
        { id: 1, title: 'Test Product', price: 10.0, stock: 1000 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: 100 }]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid quantity for product ID 1');
      expect(result.error).toContain('between 1 and 99');
    });

    it('should reject a non-integer quantity', async () => {
      mockProducts([
        { id: 1, title: 'Test Product', price: 10.0, stock: 10 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: 1.5 }]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('whole number');
    });

    it('should accept exactly 99 when stock allows it', async () => {
      mockProducts([
        { id: 1, title: 'Bulk Product', price: 5.0, stock: 99 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: 99 }]);

      expect(result.success).toBe(true);
      expect(result.subtotal).toBeCloseTo(495.0, 2);
    });
  });

  describe('Unknown products', () => {
    it('should reject an unknown product ID and name the ID', async () => {
      mockProducts([]);

      const result = await validateCartPrices([{ id: 999999, quantity: 1 }]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('999999');
    });

    it('should reject when only one product in a multi-item cart is missing', async () => {
      mockProducts([{ id: 1, title: 'Product A', price: 50.0, stock: 10 }]);

      const result = await validateCartPrices([
        { id: 1, quantity: 1 },
        { id: 2, quantity: 1 },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('2');
      expect(result.error).not.toContain('1,');
    });
  });

  describe('Stock validation', () => {
    it('should reject a quantity above available stock', async () => {
      mockProducts([
        { id: 1, title: 'Scarce Item', price: 10.0, stock: 3 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: 5 }]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
      expect(result.error).toContain('requested 5');
      expect(result.error).toContain('available 3');
    });

    it('should accept a quantity equal to available stock', async () => {
      mockProducts([
        { id: 1, title: 'Scarce Item', price: 10.0, stock: 5 },
      ]);

      const result = await validateCartPrices([{ id: 1, quantity: 5 }]);

      expect(result.success).toBe(true);
      expect(result.validatedItems![0].quantity).toBe(5);
    });

    it('should reject when any item in the cart exceeds stock', async () => {
      mockProducts([
        { id: 1, title: 'Product A', price: 50.0, stock: 10 },
        { id: 2, title: 'Product B', price: 30.0, stock: 1 },
      ]);

      const result = await validateCartPrices([
        { id: 1, quantity: 1 },
        { id: 2, quantity: 2 },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('product ID 2');
    });
  });

  describe('Security: price manipulation prevention', () => {
    it('should ignore any client-submitted price (not in CartItemInput)', async () => {
      mockProducts([
        { id: 1, title: 'Expensive Item', price: 999.99, stock: 10 },
      ]);

      const result = await validateCartPrices([
        // @ts-expect-error -- a real client cannot send a price field
        { id: 1, quantity: 1, price: 0.01 },
      ]);

      expect(result.success).toBe(true);
      expect(result.validatedItems![0].price).toBe(999.99);
      expect(result.total).toBeCloseTo(1014.98985, 2); // free shipping + tax
    });
  });

  describe('Failure handling', () => {
    it('should return an error when the DB query fails', async () => {
      findMany.mockRejectedValue(new Error('Database unavailable'));

      const result = await validateCartPrices([{ id: 1, quantity: 1 }]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database unavailable');
    });
  });
});
