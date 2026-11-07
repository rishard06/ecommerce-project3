---
name: gen-test
description: Generate comprehensive Vitest unit and integration tests for utilities, server actions, and route handlers.
---

# Test Generation Skill (Vitest)

Use this workflow to scaffold and maintain comprehensive automated test suites using Vitest, `@testing-library/react`, and `jsdom`.

## Testing Standards

- **Test Runner**: Vitest (`npm test` runs `vitest run`, `npm run test:watch` runs watch mode)
- **Path Aliases**: Always use `@/*` for project imports
- **Colocation & Locations**:
  - Utility/module tests: `lib/__tests__/<module>.test.ts`
  - Server actions & routes: `features/<feature>/__tests__/<action>.test.ts`
  - Component tests: `features/<feature>/components/__tests__/<component>.test.tsx`

## Test Structure Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('<TargetModule>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should process valid input and return expected result', async () => {
      // Arrange, Act, Assert
    });
  });

  describe('Edge Cases & Validation', () => {
    it('should reject missing, empty, or malformed input', async () => {
      // Verify boundary conditions
    });
  });

  describe('Error Handling & Security', () => {
    it('should handle downstream network/database failure gracefully', async () => {
      // Mock failure states and verify fallback / error response
    });
  });
});
```
