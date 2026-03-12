# Project Overview & Engineering Standards

## 1. Project Identity

This is a Next.js e-commerce application using the App Router and Turbopack.

- **Development:** `npm run dev`
- **Database:** Prisma ORM with PostgreSQL.
- **Authentication:** `better-auth` (Client: `lib/auth-client.js`, Server: `lib/auth.js`).
- **Styling:** Tailwind CSS (Utility-first, mobile-first, avoid arbitrary values) .
- **State Management:** React Server Components (RSC) where possible, `useActionState`/`useFormStatus` for forms, and `Zustand` for complex global client state.

## 2. Core Tech Stack (Standards)

- **Frontend:** React 19+ (Functional Components), Next.js (App Router), shadcn/ui, tailwindcss.
- **Language:** TypeScript (Primary standard). _Note: Existing files are .js; new files should be .ts/.tsx._
- **Database:** Prisma (PostgreSQL) .
- **Architecture:** Feature-Based Modules (see Folder Structure).

## 3. Senior-Level Coding Standards (SOLID/DRY)

- **Single Responsibility:** One component = one job. Extract logic into hooks.
- **Clean Logic:** Use early returns to handle errors/loading. No nested `if/else` hell.
- **Separation of Concerns (SoC):** Components are for UI; Hooks are for logic; Services/Actions are for data fetching.
- **SOLID:** - _Single Responsibility:_ One component = one job.
  - _Open/Closed:_ Design components to be extensible via props, not modified internally.
- **Type Safety:** No `any`. Use strict TypeScript interfaces for Prisma models and component props.
- **Performance:** Favor Server Components. Use `'use client'` strictly for interactivity.

## 4. Target Folder Structure (Feature-First)

I will prioritize moving toward this structure for all new tasks:
app/          # Routes & Layouts
component/    # Main UI features (Hero, Stack, etc.)
components/   # Global Shared UI (Shadcn, etc.)
features/     # Feature-based modules (E.g., Cart, Auth, Products)
│   └── [feature-name]/
│       ├── components/   # Feature-specific UI
│       ├── hooks/        # Logic/Queries/Mutations
│       ├── actions.ts    # Next.js Server Actions
│       └── types.ts      # Type definitions
lib/          # Config (Prisma, Better-Auth)
utils/        # Pure helper functions

## 5. Dev Workflow & Constraints

- **File Length:** Keep files under 250 lines. Refactor if they exceed this.
- **Naming:** Use descriptive, intention-revealing names (e.g., `isCartLoading` vs `loading`).
- **Review:** Before outputting code, verify it follows DRY and SOLID principles.
- **Auth:** Always use the existing `better-auth` patterns in `lib/` for protected routes.

## 6. Coding Constraints

- **File Size:** No single file should exceed 250 lines. If it does, refactor by extracting logic into hooks or sub-components.
- **Typing:** Use `interface` for object shapes and `type` for unions/aliases. Favor `readonly` for props.
- **Tailwind:** Use the `@tailwind` base, components, and utilities correctly. Avoid inline styles entirely.
- **Next.js:** Prefer Server Components by default. Use `'use client'` only when Interactivity or Browser APIs are required.
- **Context7:** use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
