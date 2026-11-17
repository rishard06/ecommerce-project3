import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant shell for /orders (and /account/orders, which re-exports this
 * route). Paints the header and row placeholders immediately while the order
 * list streams in.
 */
export default function OrdersLoading() {
  return (
    <div
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-12 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="mb-8 space-y-2 md:mb-10">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-10 w-56 rounded-xl md:h-12" />
        <Skeleton className="h-4 w-40 rounded-full" />
      </header>

      <ul className="space-y-4">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="glass-component flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex items-start gap-4">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-44 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-3 pl-[3.75rem] sm:pl-0">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading your orders…</span>
    </div>
  );
}
