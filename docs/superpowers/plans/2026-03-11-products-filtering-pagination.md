# Products Filtering and Pagination Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement server-side filtering by category and pagination (Next/Previous) on the `/products` page using URL query parameters and Tailwind CSS.

**Architecture:** Use Next.js Server Components to fetch data from DummyJSON API based on `searchParams`. URL will be the single source of truth (`?category=...&skip=...`).

**Tech Stack:** Next.js (App Router), Tailwind CSS, Lucide React, DummyJSON API.

---

### Task 1: Refactor Products Page to Server Component

**Files:**
- Modify: `app/products/page.tsx`
- Create: `app/products/loading.tsx`

- [ ] **Step 1: Create Loading Skeleton**
Create a `loading.tsx` file in `app/products/` with a simple skeleton UI for the sidebar and product grid.

- [ ] **Step 2: Update ProductsPage Signature**
Refactor the default export to be an async function named `ProductsPage` and accept `searchParams` prop.

- [ ] **Step 3: Define Fetching Logic**
Implement a helper function inside or outside the component to fetch data from DummyJSON based on `category` and `skip`.
URL Logic:
- If `category`: `https://dummyjson.com/products/category/${category}?limit=20&skip=${skip}`
- Else: `https://dummyjson.com/products?limit=20&skip=${skip}`

- [ ] **Step 4: Fetch Categories Dynamically**
Fetch categories from `https://dummyjson.com/products/categories` to populate the sidebar.

- [ ] **Step 5: Implement Sidebar UI with Active State**
Update the category list to use `Link` components.
- Each link: `/products?category=${name}&skip=0`
- Active logic: `const isActive = category === searchParams.category`
- Apply Tailwind classes: `bg-accent-500 text-white` for active, `hover:bg-gray-100` for inactive.

### Task 2: Implement Product Grid and Pagination

**Files:**
- Modify: `app/products/page.tsx`

- [ ] **Step 1: Render Product Grid**
Map over the fetched products and render the `ProductCard` component for each.
Ensure props are passed correctly: `id`, `title`, `price`, `image` (from `thumbnail`), `description`.

- [ ] **Step 2: Implement Empty State**
If `products.length === 0`, show a "No products found in this category" message.

- [ ] **Step 3: Implement Pagination UI**
Add "Previous" and "Next" `Link` components at the bottom of the grid.
- **Previous:** `href={`/products?category=${cat}&skip=${Math.max(0, skip - 20)}`}`
- **Next:** `href={`/products?category=${cat}&skip=${skip + 20}`}`
- Logic:
  - Disable/Hide "Previous" if `skip === 0`.
  - Disable/Hide "Next" if `skip + 20 >= total`.

### Task 3: Verification and Polishing

- [ ] **Step 1: Verify URL State**
Confirm that clicking a category updates the URL and resets `skip` to `0`.
Confirm that clicking "Next" updates the URL and the products.

- [ ] **Step 2: Verify Mobile Responsiveness**
Ensure the sidebar doesn't break on small screens (e.g., use `flex-col` for mobile and `flex-row` for desktop).

- [ ] **Step 3: Final Lint Check**
Run project linting to ensure no regressions.
