import Header from "@/components/layout/Header";
import Ticker from "@/components/marketing/Ticker";
import FeatureProducts from "@/features/products/components/FeatureProducts";
import CraftBand from "@/components/marketing/CraftBand";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Ticker copy from the Direction C mockup; the band owns the motion. */
const TICKER_ITEMS = [
  "Small batch",
  "Repairable",
  "Carbon-neutral",
  "Made in Porto",
  "No seasonal churn",
] as const;

/**
 * Direction C homepage: hero + ticker, catalog bento (t1-t6), craft band.
 * Bento DOM order is the visual order, so keyboard tab order never diverges.
 */
export default async function Home() {
  // Resolve the async bento owner here so the page tree is a plain element
  // composition; the catalog shells are server components with no boundary.
  const catalog = await FeatureProducts();

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:inline-flex focus:min-h-11 focus:cursor-pointer focus:items-center focus:rounded-full focus:bg-action focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-action-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Skip to content
      </a>

      <Header />

      <main id="content" tabIndex={-1} className="scroll-mt-24">
        <Ticker items={TICKER_ITEMS} />
        {catalog}
        <CraftBand />
      </main>
    </>
  );
}
