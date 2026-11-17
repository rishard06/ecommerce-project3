import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant shell for /account and every nested account route (profile,
 * settings, addresses, orders). Paints in <100ms on navigation while the
 * layout guard (memoized session) and the streamed dashboard data resolve.
 */
export default function AccountLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <section className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="glass-component flex items-center gap-4 p-5">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-12 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </section>

      <section className="glass-component space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-4 w-36 rounded-full" />
            </div>
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="glass-component space-y-2 p-5">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-full" />
          </div>
        ))}
      </section>
      <span className="sr-only">Loading your account…</span>
    </div>
  );
}
