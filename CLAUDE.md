# E-Commerce Project 3

A modern, high-performance e-commerce platform built with Next.js 15, featuring secure authentication, responsive design, and interactive UI components.

## 🎯 Project Overview

This is a full-stack e-commerce application with:
- **Product catalog** with detailed product pages
- **Shopping cart** with Zustand state management
- **Checkout flow** with server-side price validation
- **User authentication** via Better-Auth (OAuth + credentials)
- **Favorites/wishlist** functionality
- **Responsive design** optimized for all screen sizes

## 🛠️ Tech Stack

### Core Framework
- **Next.js 15.5+** with App Router and Turbopack
- **React 19.1.0** with Server Components
- **TypeScript 5.9+** with strict mode

### Styling & UI
- **Tailwind CSS v4** (using `@theme` inline configuration)
- **shadcn/ui** components (Radix UI primitives)
- **Lucide React** for icons
- **Motion** (Framer Motion) for animations
- **GSAP** for advanced animations

### Backend & Data
- **Prisma** ORM with PostgreSQL
- **Better-Auth** for authentication
- **Stripe** for payments
- **Zod** for schema validation
- **Zustand** for client state management

### Testing
- **Vitest** for unit tests
- **Testing Library** for React component tests

## 📁 Project Structure

```
ecommerce-project3/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes (login, register)
│   ├── (shop)/                   # Main shop routes
│   │   ├── checkout/             # Checkout flow
│   │   └── page.tsx              # Home page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles with Tailwind
├── features/                     # Feature-based modules
│   ├── cart/                     # Cart components
│   ├── checkout/                 # Checkout logic & components
│   └── products/                 # Product display components
├── components/                   # Shared components
│   ├── animations/               # Animation components (Stack, BlurText, SplitText)
│   ├── layout/                   # Layout components (NavBar, Header, Footer)
│   ├── marketing/                # Marketing components (Features, Hero)
│   └── ui/                       # shadcn/ui components
├── lib/                          # Utilities and configuration
│   ├── store/                    # Zustand stores (cart, favorites)
│   ├── __tests__/                # Unit tests
│   ├── auth.ts                   # Better-Auth configuration
│   ├── auth-client.ts            # Client-side auth utilities
│   ├── prisma.ts                 # Prisma client
│   ├── products.ts               # Product utilities
│   ├── price-validation.ts       # Server-side price validation
│   └── utils.ts                  # General utilities
├── prisma/                       # Database schema and migrations
├── public/                       # Static assets
└── types/                        # TypeScript type definitions
```

## 🎨 Design System

### Component Library
- **shadcn/ui** (Radix-based components)
- Component configuration: `components.json`
- Import alias: `@/*` for all imports
- Styling approach: Tailwind utility classes with `cn()` helper

### Styling Conventions
1. **Use Tailwind CSS v4 syntax** with `@theme` inline configuration
2. **Semantic color tokens**: Use `bg-background`, `text-foreground`, `text-muted-foreground`
3. **Never hardcode colors**: Always use design tokens
4. **Responsive design**: Mobile-first approach
5. **Dark mode**: Automatically handled via CSS variables

### Animation Guidelines
- **Motion (Framer Motion)** for React animations
- **GSAP** for complex timeline animations
- Custom components in `components/animations/`:
  - `Stack`: 3D card stack with swipe interactions
  - `BlurText`: Text reveal with blur effect
  - `SplitText`: Character-by-character text animations

## 🔐 Authentication

**Better-Auth** configuration:
- OAuth providers: GitHub (configured)
- Email/password authentication
- Session management
- Client utilities: `lib/auth-client.ts`
- Server config: `lib/auth.ts`

### Auth Flow
1. User redirected to `/login` when not authenticated
2. Cart and favorites redirect to login
3. Sessions revoked on logout
4. GitHub OAuth forces account selection every time

## 🛒 State Management

### Zustand Stores

**Cart Store** (`lib/store/cart-store.ts`)
- Add/remove items
- Update quantities
- Calculate totals
- Persist to localStorage

**Favorites Store** (`lib/store/favorites-store.ts`)
- Add/remove favorites
- Check if product is favorited
- Persist to localStorage

## 🔒 Security & Validation

### Price Validation
- **Server-side validation** in `lib/price-validation.ts`
- Prevents client-side price manipulation
- Tests in `lib/__tests__/price-validation.test.ts`

### Security Analysis
- Security reports in `.gemini_security/`
- Current focus: Phase 1 - Security & Price Validation

## 🧪 Testing

### Testing Stack
- **Vitest** as test runner
- **@testing-library/react** for component tests
- **jsdom** for DOM environment

### Running Tests
```bash
npm test          # Run all tests once
npm run test:watch # Watch mode
```

### Test Organization
- Unit tests: `lib/__tests__/`
- Component tests: Colocated with components
- Test files: `*.test.ts` or `*.test.tsx`

## 🚀 Development Workflow

### Starting Development
```bash
npm install       # Install dependencies
npm run dev       # Start dev server with Turbopack
```
Open [http://localhost:3000](http://localhost:3000)

### Building for Production
```bash
npm run build     # Build with Turbopack
npm start         # Start production server
```

### Database
```bash
npx prisma generate   # Generate Prisma client
npx prisma migrate dev # Run migrations
npx prisma studio     # Open Prisma Studio
```

## 📝 Code Conventions

### TypeScript
- **Strict mode enabled**
- Import alias: `@/*` resolves to project root
- Type definitions in `types/` directory
- Prefer type inference over explicit types
- Use `interface` for objects, `type` for unions/intersections

### File Naming
- React components: PascalCase (e.g., `ProductCard.tsx`)
- Utilities/hooks: camelCase (e.g., `getUserInfo.ts`)
- Page routes: lowercase (e.g., `page.tsx`, `layout.tsx`)

### Component Structure
```tsx
// 1. Imports (external → internal → types)
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types"

// 2. Types/Interfaces
interface ProductCardProps {
  product: Product
}

// 3. Component
export function ProductCard({ product }: ProductCardProps) {
  // State/hooks first
  const [isLoading, setIsLoading] = useState(false)
  
  // Event handlers
  const handleClick = () => {
    // ...
  }
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### React Patterns
1. **Use Server Components by default** (no `"use client"` unless needed)
2. **Add `"use client"` only when**:
   - Using hooks (`useState`, `useEffect`, etc.)
   - Adding event handlers (`onClick`, etc.)
   - Using browser APIs
3. **Prefer composition** over prop drilling
4. **Extract repeated logic** into custom hooks
5. **Keep components focused** (single responsibility)

### Git Workflow
- **Main branch**: `main`
- **Feature branches**: `feature/description` or `phase/number-description`
- **Commit messages**: Clear, concise, conventional format
- **Never force push** to main
- **Always create new commits** (avoid amending)

## 🎯 Current Work

**Active Branch**: `phase/1-security-price-validation`

**Recent Changes**:
- ✅ Server-side price validation implemented
- ✅ Cart functionality with Zustand
- ✅ Checkout flow started
- ✅ User authentication with Better-Auth

**Modified Files**:
- `.gemini_security/SECURITY_ANALYSIS_TODO.md`
- `app/globals.css`
- `features/cart/components/OrderSummary.tsx`
- `features/checkout/components/CheckoutSummary.tsx` (new)
- `features/checkout/types.ts` (new)

## 🔍 Common Tasks

### Adding a New Feature
1. Create feature directory in `features/`
2. Add types to `features/<feature>/types.ts`
3. Create components in `features/<feature>/components/`
4. Add actions in `features/<feature>/actions.ts` (if needed)
5. Add tests in `features/<feature>/__tests__/`

### Adding a shadcn/ui Component
```bash
npx shadcn@latest add <component-name>
```

### Adding a New Route
1. Create directory in `app/(shop)/` or `app/(auth)/`
2. Add `page.tsx` for the page component
3. Add `layout.tsx` if custom layout needed
4. Use Server Components by default

### Working with Prisma
```bash
npx prisma studio          # GUI for database
npx prisma generate        # Regenerate client after schema changes
npx prisma migrate dev     # Create and apply migration
npx prisma db push         # Push schema without migration (dev only)
```

## 🚨 Important Notes

### DO NOT
- ❌ Hardcode colors (use design tokens)
- ❌ Use emojis as icons (use Lucide icons)
- ❌ Commit `.env` files
- ❌ Force push to main
- ❌ Skip pre-commit hooks
- ❌ Amend commits (create new ones)
- ❌ Use `git add .` (be specific)

### DO
- ✅ Use TypeScript strict mode
- ✅ Write tests for new features
- ✅ Use Server Components by default
- ✅ Validate data with Zod
- ✅ Use semantic HTML
- ✅ Make UI accessible (ARIA labels, keyboard nav)
- ✅ Test responsive design (mobile-first)
- ✅ Keep components small and focused

## 📚 External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Better-Auth Documentation](https://better-auth.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Motion Documentation](https://motion.dev)

## 🤖 AI Assistant Guidelines

When working on this project:

1. **Always check existing code first** before implementing new features
2. **Follow the established patterns** in the codebase
3. **Use the project's dependencies** (don't add new ones without discussion)
4. **Maintain consistency** with existing naming conventions
5. **Write tests** for new functionality
6. **Consider accessibility** in all UI work
7. **Verify changes** by running the dev server
8. **Read files before editing** to understand context
9. **Use the correct import aliases** (`@/*`)
10. **Respect the security guidelines** (especially price validation)

---

**Last Updated**: October 2026
**Project Owner**: richard06
**Git Repository**: ecommerce-project3
