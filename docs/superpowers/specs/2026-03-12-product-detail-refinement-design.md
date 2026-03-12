# Product Detail Page Refinement Design

Refine the product detail page to follow the homepage's glassmorphism style while maintaining a professional "Apple-like" clean aesthetic.

## 1. Visual Style (Glassmorphism + Apple Clean)
- **Glassmorphism**: Utilize the `.glass-component` utility (bg-white/30, backdrop-blur-xl, shadow-2xl/20, border-white/40).
- **Whitespace**: Increase padding and margins to create a more airy, premium feel.
- **Borders & Shadows**: Use ultra-refined 1px borders and soft, large shadows for depth.
- **Colors**:
  - Primary Background: The existing multi-step gradient (`#e8f4f8, #d1e7dd, #b8dbd9`).
  - Highlights: `accent-500` (#ccf381) for CTAs and interactive states.
  - Readability: Ensure high contrast for text in both light and dark modes.

## 2. Dynamic Content (API-First)
- **Storage/Color Selection**: Conditionally render these sections. If the API data doesn't include specific storage or color variants, do not show the UI for them.
- **Reviews**: Fetch and display real reviews from the DummyJSON `reviews` field.
- **Rating Distribution**: Dynamically calculate the 1-5 star distribution based on the API reviews.

## 3. Component Refinements
- **ProductGallery**: Main image and thumbnails inside glass cards.
- **ProductInfo**: Refined typography. Large, bold headings. Clear pricing. Professional "Add to Cart" button using the brand's accent color.
- **CustomerReviews**: Each review is a subtle glass card. Avatars and names from API data.
- **Tabs**: Clean, minimal line-based design for switching between details, specifications, and reviews.

## 4. Engineering Standards
- Follow the feature-based structure (`features/products/components/`).
- Maintain type safety by updating `InternalProduct` to accurately reflect the dynamic nature of the data.
- Ensure the page is fully responsive and accessible.
