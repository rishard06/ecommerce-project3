# Product Detail Page Refinement Design

Refine the product detail page to accurately match the provided Stitch design snippet, utilizing the project's `accent` color for interactive elements and ensuring a high-quality, production-grade UI.

## Objective
- Achieve 1:1 visual parity with the Stitch design snippet.
- Use `accent-500` and `accent-600` for primary buttons and interactive highlights.
- Maintain the project's root-level feature structure (`features/products/`).
- Ensure full responsiveness and accessibility.

## Visual Design
- **Typography**: `Manrope` or `Geist Sans`. Large, bold titles (`text-4xl font-black`).
- **Color Palette**:
    - **Primary Action**: `bg-accent-500` (`#ccf381`) with `text-gray-primary`.
    - **Secondary Backgrounds**: `bg-white/30` with `backdrop-blur-xl` (glassmorphism).
    - **Borders**: `slate-200` (Light) / `slate-800` (Dark).
- **Iconography**: `lucide-react` mapped from Material Symbols.

## Component Breakdown

### 1. ProductGallery
- **Layout**: 7/12 column on large screens.
- **Main Image**: `aspect-video` with rounded corners and subtle border.
- **Thumbnails**: 4-column grid, `aspect-square`. Active state uses `accent-500` ring.

### 2. ProductInfo
- **Layout**: 5/12 column on large screens.
- **CTAs**: 
    - `Add to Cart`: Large pill-shaped button, `bg-accent-500`.
    - `Favorite`: Icon button with `red-500` hover state.
- **Pickers**:
    - Colors: Circular swatches with ring highlights.
    - Storage: `accent-500` themed buttons.

### 3. ProductTabs
- **Navigation**: Clean horizontal list with bottom border active indicator.
- **Content**: Detailed engineering section with 2-column layout and "check circle" lists.

### 4. CustomerReviews
- **Summary**: Large numeric rating (`text-6xl font-black`) with star breakdown.
- **Progress Bars**: `bg-accent-500` for the filled portion.
- **List**: Individual review cards with user avatars and helpfulness buttons.

## Implementation Details
- **Route**: `app/products/[id]/page.tsx`.
- **Data**: Fetch from `DummyJSON` and map to `InternalProduct` type.
- **Components**: Located in `features/products/components/`.

## Verification Plan
- [ ] Compare visual output with Stitch snippet side-by-side.
- [ ] Verify `accent` color usage on all buttons.
- [ ] Test mobile responsiveness (stacked layout).
- [ ] Ensure all images load correctly from configured remote patterns.
