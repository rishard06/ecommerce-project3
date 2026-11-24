import type { ReactNode } from "react";
import { Suspense } from "react";
import { AccountNav } from "@/features/account/components/AccountNav";
import { requireAccountSession } from "@/features/account/require-session";
import { Skeleton } from "@/components/ui/skeleton";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      {/*
       * Shell-first: the frame paints before the DB-backed session guard
       * resolves. Anonymous visitors still land on /login (the guard
       * redirects with ?next=) — after a skeleton flash, not a blank hang.
       */}
      <Suspense fallback={<AccountHeaderSkeleton />}>
        <AccountHeader />
      </Suspense>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <aside className="lg:col-span-3">
          <Suspense fallback={<AccountNavSkeleton />}>
            <AccountNavLoader />
          </Suspense>
        </aside>
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}

function AccountHeaderSkeleton() {
  return (
    <header
      className="mb-8 space-y-2 md:mb-10"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
        Your account
      </p>
      <Skeleton className="h-9 w-48 rounded-md md:h-12" />
      <span className="sr-only">Loading account header…</span>
    </header>
  );
}

async function AccountHeader() {
  const session = await requireAccountSession("/account");

  return (
    <header className="mb-8 space-y-2 md:mb-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
        Your account
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
        Hello, {session.user.name?.split(" ")[0] || "there"}
      </h1>
    </header>
  );
}

function AccountNavSkeleton() {
  return (
    <div
      className="glass-component space-y-3 p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-4 w-32 rounded-full" />
      <Skeleton className="h-4 w-24 rounded-full" />
      <span className="sr-only">Loading account navigation…</span>
    </div>
  );
}

async function AccountNavLoader() {
  const session = await requireAccountSession("/account");

  return (
    <AccountNav
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  );
}
