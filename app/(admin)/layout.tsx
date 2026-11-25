import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import NavBar from "@/components/layout/NavBar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminNav } from "@/features/admin/components/AdminNav";
import { getCurrentUser, getSession } from "@/features/identity/server/guards";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Route-group guard and shell for every admin page:
 * - anonymous visitors go to the login page;
 * - authenticated customers get a not-found page instead of a 500.
 *
 * The storefront chrome deliberately wraps every admin route so the dashboard
 * reads as part of the same store. The wrapper omits `bg-background` so the
 * body's sage gradient shows through, matching `/account`.
 *
 * `AdminNav` lives here rather than in a page so it survives client-side
 * navigation between `/admin/*` routes — the sidebar never remounts or
 * flickers while the page below streams. Mirrors `app/(shop)/account/layout.tsx`.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    notFound();
  }

  return (
    <div className="min-h-dvh text-foreground">
      <AnnouncementBar />
      <NavBar />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/*
           * Sticky on desktop so long order tables scroll under a fixed nav;
           * `self-start` stops the grid item from stretching to full row
           * height (which would leave no room to stick).
           */}
          <aside className="lg:sticky lg:top-24 lg:col-span-3 lg:self-start">
            <Suspense fallback={<AdminNavSkeleton />}>
              <AdminNavLoader />
            </Suspense>
          </aside>

          {/*
           * `min-w-0` keeps the 620px-wide recent-orders table scrolling
           * inside its card instead of pushing a page-level horizontal
           * scrollbar. Page-level grids repeat the guard with `minmax(0, …)`
           * on their columns.
           */}
          <div className="min-w-0 lg:col-span-9">{children}</div>
        </div>
      </div>
    </div>
  );
}

function AdminNavSkeleton() {
  return (
    <div
      className="glass-component space-y-3 p-4 sm:p-5"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 border-b border-gray-primary/10 pb-4">
        <Skeleton className="size-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-3 w-36 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <span className="sr-only">Loading admin navigation…</span>
    </div>
  );
}

/**
 * Profile fields (`name`, `email`, `image`) are not part of the guard's
 * `SessionUser`, so the nav pulls them from the same memoized session call —
 * this costs no extra database work inside an admin request.
 */
async function AdminNavLoader() {
  const session = await getSession();

  return (
    <AdminNav
      user={{
        name: session?.user?.name ?? "Admin",
        email: session?.user?.email ?? "",
        image: session?.user?.image ?? null,
      }}
    />
  );
}
