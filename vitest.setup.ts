import { AsyncLocalStorage } from 'node:async_hooks';
import '@testing-library/jest-dom/vitest';

// Next's request-scoped storage expects `globalThis.AsyncLocalStorage`, which
// it installs in its own Node runtime. Vitest's node environment does not, so
// without this shim importing `next/cache` (`cacheLife`, `cacheTag`,
// `updateTag`) throws
// "Invariant: AsyncLocalStorage accessed in runtime where it is not available".
// Test-only mirror of the production runtime; harmless for suites that never
// touch Next internals.
(globalThis as Record<string, unknown>).AsyncLocalStorage ??= AsyncLocalStorage;
