# Products Filtering and Pagination Design

> **Feature Name:** Products Filtering and Pagination
> **Date:** 2026-03-11
> **Status:** Final

## 1. Objective
Implement dynamic product filtering by category and pagination (Next/Previous) on the `/products` page using Next.js Server Components and URL query parameters.

## 2. Architecture
- **Server-Side Rendering (SSR):** Use Next.js Server Components for the `/products` page.
- **State Management:** URL Search Parameters (`category`, `skip`, `limit`) will serve as the single source of truth for the UI state.
- **Data Source:** Fetch data from [DummyJSON API](https://dummyjson.com/docs/products).
- **Navigation:** Use Next.js `Link` components to trigger re-renders by updating the URL.

## 3. Data Flow
1. User clicks a category link or pagination button.
2. Browser navigates to a URL like `/products?category=smartphones&skip=20`.
3. Next.js passes `searchParams` to the `ProductsPage` component.
4. `ProductsPage` fetches products based on:
   - If `category` exists: `https://dummyjson.com/products/category/{category}?limit=20&skip={skip}`
   - Else: `https://dummyjson.com/products?limit=20&skip={skip}`
5. When switching categories, `skip` is always reset to `0`.
6. The page re-renders on the server and is sent to the client.

## 4. Components & UI Logic (Tailwind CSS)

### 4.1. Category Sidebar
- **Component:** `app/products/page.tsx` (Refactor to use `Page` component name).
- **Dynamic Categories:** Fetch from `https://dummyjson.com/products/categories` or use a shared hook.
- **Active State:** 
  ```tsx
  const isActive = currentCategory === category.name;
  const linkClasses = `w-full px-4 py-3 rounded-full flex justify-between ${isActive ? 'bg-accent-500 text-white' : 'hover:bg-gray-100 text-gray-quaternary'}`;
  ```
- **Reset Skip:** Each category `Link` will set `skip=0`.

### 4.2. Product Grid
- Display products fetched from the API.
- Use existing `ProductCard` component if available.
- Handle "Empty State": If no products are found, display a "No products found" message.

### 4.3. Pagination Controls
- **Previous Button:** 
  - `href={`/products?category=${cat}&skip=${Math.max(0, skip - 20)}`}`
  - Disabled/Hidden if `skip === 0`.
- **Next Button:**
  - `href={`/products?category=${cat}&skip=${skip + 20}`}`
  - Disabled if `skip + 20 >= total` (where `total` is from API response).

## 5. Implementation Considerations
- **Type Safety:** Ensure proper types for `Product`, `ProductResponse`, and `Category`.
- **Loading States:** Create `app/products/loading.tsx` with a skeleton UI.
- **Error Handling:** Use a `try/catch` block in the page fetch and provide a fallback UI or `error.tsx`.
- **Performance:** Utilize Next.js caching for API requests.
- **Mobile Responsiveness:** Ensure the layout shifts from sidebar to top-bar or drawer on smaller screens.

## 6. Testing Strategy
- Verify that clicking a category updates the URL and the product list.
- Verify that "Next" fetches the next 20 items.
- Verify that "Next" button is disabled on the last page.
- Verify that switching categories resets `skip` to `0`.
- Verify that the "All products" link resets filters.
