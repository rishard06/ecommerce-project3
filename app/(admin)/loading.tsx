import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant shell for every /admin route. The admin layout guard
 * (`getCurrentUser`, now memoized per request) resolves before this paints,
 * so authorized navigations show structure immediately while tables stream.
 */
export default function AdminLoading() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-live="polite">
      <header className="grid gap-2">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-full" />
      </header>

      <div className="space-y-3 rounded-xl border p-4">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-full" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 border-t py-3">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="ml-auto h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading admin…</span>
    </div>
  );
}
