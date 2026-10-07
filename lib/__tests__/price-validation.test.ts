import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCartPrices } from '../price-validation';
import * as products from '../products';

// Mock the products module
vi.mock('../products', () => ({
  getProduct: vi.fn(),
}));

describe('validateCartPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should validate a single item with correct price from DummyJSON', async () => {
      // Mock DummyJSON API response
      vi.mocked(products.getProduct).mockResolvedValue({
        id: 1,
        title: 'Test Product',
        price: 99.99,
      } as any);

      const result = await validateCartPrices([
        { id: 1, quantity: 2 }
      ]);

      expect(result.success).toBe(true);
      expect(result.validatedItems).toHaveLength(1);
      expect(result.validatedItems![0]).toEqual({
        id: 1,
        title: 'Test Product',
        price: 99.99,
        quantity: 2
      });
      expect(result.subtotal).toBe(199.98); // 99.99 * 2
      expect(result.tax).toBeCloseTo(2.9997, 2); // 199.98 * 0.015
      expect(result.total).toBeCloseTo(202.9797, 2); // 199.98 + 2.9997
    });

    it('should validate multiple items and calculate correct totals', async () => {
      vi.mocked(products.getProduct)
        .mockResolvedValueOnce({ id: 1, title: 'Product A', price: 50.00 } as any)
        .mockResolvedValueOnce({ id: 2, title: 'Product B', price: 30.00 } as any);

      const result = await validateCartPrices([
        { id: 1, quantity: 2 },
        { id: 2, quantity: 1 }
      ]);

      expect(result.success).toBe(true);
      expect(result.validatedItems).toHaveLength(2);
      expect(result.subtotal).toBe(130.00); // (50*2) + (30*1)
      expect(result.tax).toBeCloseTo(1.95, 2); // 130 * 0.015
      expect(result.total).toBeCloseTo(131.95, 2);
    });

    it('should handle products with different quantities', async () => {
      vi.mocked(products.getProduct).mockResolvedValue({
        id: 5,
        title: 'Bulk Item',
        price: 10.00,
      } as any);

      const result = await validateCartPrices([
        { id: 5, quantity: 10 }
      ]);

      expect(result.success).toBe(true);
      expect(result.subtotal).toBe(100.00);
      expect(result.total).toBeCloseTo(101.50, 2); // 100 + (100 * 0.015)
    });
  });

  describe('Edge Cases', () => {
    it('should reject empty cart', async () => {
      const result = await validateCartPrices([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cart is empty');
    });

    it('should handle quantity of 1', async () => {
      vi.mocked(products.getProduct).mockResolvedValue({
        id: 1,
        title: 'Single Item',
        price: 25.00,
      } as any);

      const result = await validateCartPrices([
        { id: 1, quantity: 1 }
      ]);

      expect(result.success).toBe(true);
      expect(result.subtotal).toBe(25.00);
    });

    it('should handle large quantities', async () => {
      vi.mocked(products.getProduct).mockResolvedValue({
        id: 1,
        title: 'Bulk Product',
        price: 5.00,
      } as any);

      const result = await validateCartPrices([
        { id: 1, quantity: 999 }
      ]);

      expect(result.success).toBe(true);
      expect(result.subtotal).toBe(4995.00); // 5 * 999
    });

    it('should handle products with decimal prices', async () => {
      vi.mocked(products.getProduct).mockResolvedValue({
        id: 1,
        title: 'Decimal Price',
        price: 9.99,
      } as any);

      const result = await validateCartPrices([
        { id: 1, quantity: 3 }
      ]);

      expect(result.success).toBe(true);
      expect(result.subtotal).toBeCloseTo(29.97, 2);
      expect(result.tax).toBeCloseTo(0.44955, 2);
      expect(result.total).toBeCloseTo(30.41955, 2);
    });
  });

  describe('Error Cases', () => {
    it('should handle product not found (API error)', async () => {
      vi.mocked(products.getProduct).mockRejectedValue(
        new Error('Product not found')
      );

      const result = await validateCartPrices([
        { id: 999, quantity: 1 }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not fetch prices for product IDs: 999');
    });

    it('should handle multiple failed product fetches', async () => {
      vi.mocked(products.getProduct)
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await validateCartPrices([
        { id: 1, quantity: 1 },
        { id: 2, quantity: 1 }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not fetch prices');
      expect(result.error).toContain('1');
      expect(result.error).toContain('2');
    });

    it('should handle network timeout/error', async () => {
      vi.mocked(products.getProduct).mockRejectedValue(
        new Error('Network error: timeout')
      );

      const result = await validateCartPrices([
        { id: 1, quantity: 1 }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle mixed success and failure', async () => {
      vi.mocked(products.getProduct)
        .mockResolvedValueOnce({ id: 1, title: 'Product A', price: 50.00 } as any)
        .mockRejectedValueOnce(new Error('Product B not found'));

      const result = await validateCartPrices([
        { id: 1, quantity: 1 },
        { id: 2, quantity: 1 }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not fetch prices for product IDs: 2');
    });
  });

  describe('Security: Price Manipulation Prevention', () => {
    it('should ignore client-submitted prices (not in CartItemInput)', async () => {
      // Client tries to send fake price - but our type only accepts id & quantity
      vi.mocked(products.getProduct).mockResolvedValue({
        id: 1,
        title: 'Expensive Item',
        price: 999.99, // Real price from API
      } as any);

      // Client can only send id and quantity (no price field)
      const result = await validateCartPrices([
        { id: 1, quantity: 1 }
        // Note: No price field allowed in CartItemInput!
      ]);

      expect(result.success).toBe(true);
      // Server uses real price from API, not client data
      expect(result.validatedItems![0].price).toBe(999.99);
      expect(result.total).toBeCloseTo(1014.9885, 2); // 999.99 + tax
    });

    it('should always use server-fetched prices for totals', async () => {
      vi.mocked(products.getProduct).mockResolvedValue({
        id: 1,
        title: 'Test Product',
        price: 100.00,
      } as any);

      const result = await validateCartPrices([
        { id: 1, quantity: 5 }
      ]);

      // Total must be based on server price (100 * 5 = 500)
      expect(result.subtotal).toBe(500.00);
      expect(result.tax).toBe(7.50); // 500 * 0.015
      expect(result.total).toBe(507.50);
    });
  });

  describe('Tax Calculation', () => {
    it('should calculate 1.5% tax correctly', async () => {
      vi.mocked(products.getProduct).mockResolvedValue({
        id: 1,
        title: 'Test',
        price: 100.00,
      } as any);

      const result = await validateCartPrices([
        { id: 1, quantity: 1 }
      ]);

      expect(result.tax).toBe(1.50); // 100 * 0.015
    });

    it('should apply tax to subtotal, not individual items', async () => {
      vi.mocked(products.getProduct)
        .mockResolvedValueOnce({ id: 1, title: 'A', price: 40.00 } as any)
        .mockResolvedValueOnce({ id: 2, title: 'B', price: 60.00 } as any);

      const result = await validateCartPrices([
        { id: 1, quantity: 1 },
        { id: 2, quantity: 1 }
      ]);

      expect(result.subtotal).toBe(100.00);
      expect(result.tax).toBe(1.50); // Tax on total (40+60) * 0.015
      expect(result.total).toBe(101.50);
    });
  });
});
