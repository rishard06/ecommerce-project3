import { getFeatureProducts } from "@/lib/products";
import LandingCarouselSlides from "./LandingCarouselSlides";
import {
  LANDING_CAROUSEL_LIMIT,
  toLandingCarouselSlides,
} from "./landing-carousel-data";

/**
 * Landing carousel: highest-rated real catalog products, fetched on the server
 * and handed to the client only for embla (drag, autoplay, dots) and hooks.
 */
export default async function LandingCarousel() {
  const products = await getFeatureProducts(LANDING_CAROUSEL_LIMIT);
  const slides = toLandingCarouselSlides(products);

  if (slides.length === 0) return null;

  return (
    <section
      aria-labelledby="landing-carousel-heading"
      className="w-full px-4 pb-6 pt-2 sm:px-6 md:pb-10 md:pt-6"
    >
      <div className="mx-auto w-full max-w-7xl">
        <h2 id="landing-carousel-heading" className="sr-only">
          Product highlights
        </h2>
        <LandingCarouselSlides slides={slides} />
      </div>
    </section>
  );
}
