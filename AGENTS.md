# Ecommerce-project3 — Next.js 15 + React 19 + TS strict

- Alias `@/*`. Server Components by default; `"use client"` only for hooks, handlers, browser APIs.
- Tailwind v4 `@theme` tokens (`bg-background`, `text-foreground`). Never hardcode colors. Lucide icons, no emoji icons.
- Validate with Zod. `npm test` / `npm run typecheck`. Vitest globals + `vitest.setup.ts`; per-file jsdom pragma.
- DB: `npx prisma generate | migrate dev | studio`. Never commit `.env`.
- Git: `main` protected — never force-push/amend, never `git add .`.
- Workflow (GitHub Flow): branch `type/short-name` (`feat/`, `fix/`, `chore/`, `test/`, `docs/`) from fresh `main`; Conventional Commits; PR per unit of work, merge, then delete the branch locally and on origin. Never let merged branches accumulate.
- Worktrees are local scratch only (isolated builds), never pushed, never part of review.

## Auth (Better-Auth, GitHub OAuth + credentials)

- Unauthenticated users redirect to `/login`; cart/favorites also redirect.
- GitHub OAuth forces account selection every time. Sessions revoked on logout.
- Client: `lib/auth-client.ts`. Server: `lib/auth.ts`.

## Price validation (security-critical)

- Server-side only in `features/cart/server/quote-cart.ts`. Never trust client prices.
- Security reports in `.gemini_security/`; current focus Phase 1 — price validation.

## Current work

- Branch `phase/1-security-price-validation`: price validation done, cart + checkout in progress, auth wired.
- Source of truth is `git status` / `git log`, not this file.

## Skill precedence (one per task, never both sides)

- TDD: `tdd` | Hard bug: `diagnosing-bugs`, trivial: `systematic-debugging`
- Multi-ticket: `subagent-driven-development`, single: `implement`
- Plan: `to-spec` → `to-tickets` | Review: `code-review` | Docs: `writing-for-agents`
- `tdd` needs pre-agreed seams from `to-spec`; subagent never invents one.
- Full background + table stays in `CLAUDE.md` §Skill Precedence — read it when running a paired workflow.
