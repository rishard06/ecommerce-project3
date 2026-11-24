import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level placeholder for `/admin`, mirroring the dashboard's shell
 * geometry (header, sidebar, four stats, chart + two side cards, orders +
 * activity). It paints while the page's guard and data read resolve.
 */
export function AdminDashboardSkeleton() {
  return (
    <main aria-busy="true" aria-live="polite">
      <header className="mb-8 space-y-2 md:mb-10">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-9 w-48 rounded-lg md:h-10" />
        <Skeleton className="h-4 w-64 max-w-full rounded-full" />
      </header>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <aside className="lg:col-span-3">
          <div className="glass-component p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-3 border-b border-gray-primary/10 pb-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-3 w-36 max-w-full rounded-full" />
              </div>
            </div>
            <nav
              aria-label="Admin"
              className="flex gap-1 overflow-hidden lg:flex-col"
            >
              {[0, 1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-24 shrink-0 rounded-xl lg:w-full"
                />
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-4 lg:col-span-9">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass-component space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                </div>
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-full" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="glass-component min-w-0 space-y-4 p-5">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-3 w-52 max-w-full rounded-full" />
              <Skeleton className="h-[220px] w-full rounded-xl sm:h-[260px]" />
            </div>
            <div className="grid gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="glass-component space-y-4 p-5">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-3 w-44 max-w-full rounded-full" />
                  <div className="space-y-3">
                    {[0, 1, 2].map((row) => (
                      <Skeleton key={row} className="h-4 w-full rounded-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="glass-component min-w-0 space-y-4 p-5">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-3 w-48 max-w-full rounded-full" />
              <div className="space-y-3">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-4 w-40 max-w-full rounded-full" />
                    <Skeleton className="ml-auto h-6 w-20 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-component space-y-4 p-5">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-3 w-44 max-w-full rounded-full" />
              <div className="space-y-3">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-start gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-36 max-w-full rounded-full" />
                      <Skeleton className="h-3 w-44 max-w-full rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only">Loading admin dashboard…</span>
    </main>
  );
}
