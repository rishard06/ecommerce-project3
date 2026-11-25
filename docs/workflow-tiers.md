# Workflow tiers — checklists

Tier is chosen by the router in `AGENTS.md` (route by risk, not size). Run only the chosen tier's checklist. Shared guards (`main` protected, Conventional Commits, never `git add .`) apply to all tiers — see `AGENTS.md`.

## Heavy — multi-ticket, cross-cutting, or risky paths

Use for payments/checkout/auth/migrations, unknown scope, or 3+ files across features.

1. **Grill 1 round.** Done when scope is confirmed and recorded; do not implement before confirmation.
2. **Worktree per ticket** off fresh `main`. Setup: install deps, `npx prisma generate`, run touched tests as baseline. Done when baseline state is recorded.
3. **Dispatch implementers in parallel**, one per worktree, model DeepSeek Flash High default. Each dispatch carries: task fit in one line, brief path as the requirements source, interfaces/decisions from earlier tasks the brief cannot know, resolutions of ambiguities noticed, report path + report contract. Exact values (numbers, strings, signatures) live only in the brief; no pasted history. State **max 2 fix rounds** in the dispatch. Implementers never dispatch subagents. Done when every implementer report is filed.
4. **Review risky paths only**, one reviewer per ticket. Reviewer inputs: brief + report + diff package. Verdicts required: spec compliance AND quality. Re-reviews are scoped to the fix diff. Done when every ticket is APPROVED or findings are parked with recorded rulings.
5. **Tests tiered.** Touched suites + `npm run typecheck` in-task. Full `npm test` once, backgrounded, pre-PR. Done when full suite is green or the env-gate is disclosed with 0 assertion failures.
6. **PR per ticket**, merge after approval, delete branch locally and on origin, remove worktree. Done when `git status` shows `main` in sync and no merged branches remain.

## Light — single ticket, known files, non-critical path

1. **Clarify inline only if ambiguous** (2–3 questions max); otherwise proceed. Done when there is no open question blocking the edit.
2. **Branch** (`type/short-name` off fresh `main`; worktree if `main` is busy). Done when on the branch.
3. **Implement inline** — no subagents for the edit itself. Done when the change matches the ticket.
4. **Self-review** + `npm run typecheck` + touched suites. Spawn a reviewer subagent only if the diff proves judgment-heavy mid-task. Done when typecheck is clean and touched tests pass.
5. **PR per ticket**, merge, delete branch. Done when `main` is in sync and the branch is gone.

## Lighter — trivial, no logic change

Use for one file or same-shape edits: tokens, copy, styles, config.

1. **Branch, edit** — no grill, no reviewer. Done when the edit matches the request.
2. **Verify:** `npm run typecheck` + the adjacent test file. Done when both pass.
3. **PR** (same-theme trivials may share one PR), merge, delete branch. Done when `main` is in sync and the branch is gone.
