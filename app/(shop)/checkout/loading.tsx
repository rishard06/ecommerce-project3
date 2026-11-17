import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant shell for /checkout. The checkout form and summary are client
 * components that hydrate fast, but this guarantees the router paints
 * something the moment navigation starts instead of blocking.
 */
export default function CheckoutLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-10 flex flex-col justify-between gap-5 md:mb-12 md:flex-row md:items-end">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-10 w-48 rounded-xl md:h-12" />
        </div>
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>

      <div className="mb-8 max-w-3xl">
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-4 lg:col-span-8">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading checkout…</span>
    </div>
  );
}
