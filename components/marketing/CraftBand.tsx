import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Editorial craft band: a full-bleed asymmetric split (image left,
 * story right) that breaks the card-grid rhythm of the sections around it.
 * No card chrome — no rounded frame, border, or shadow — just an
 * edge-to-edge wash with editorial proportions. Static by design; the
 * page wraps it in a `Reveal` like every other section.
 */
export default function CraftBand() {
  return (
    <section aria-labelledby="craft-heading" className="w-full bg-muted">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-12 md:gap-12 md:py-28">
        <div className="md:col-span-7">
          <Image
            src="/landing/craft.webp"
            alt="Leafy green plant in a dark bowl planter resting on a tall black metal stand"
            width={1024}
            height={1024}
            sizes="(min-width: 768px) 58vw, 100vw"
            className="h-auto w-full object-cover"
          />
        </div>
        <div className="md:col-span-5">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-gray-tertiary uppercase">
            Our craft
          </p>
          <h2
            id="craft-heading"
            className="mb-4 font-display text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl"
          >
            Made to be kept, not replaced
          </h2>
          <p className="mb-3 leading-relaxed text-gray-secondary">
            We pick materials that age well and joints that hold — the
            unglamorous decisions that decide whether something lasts a year
            or a decade.
          </p>
          <p className="mb-6 leading-relaxed text-gray-secondary">
            If it can&apos;t be repaired, we don&apos;t sell it. That&apos;s
            the whole philosophy.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-primary underline underline-offset-4 transition-colors hover:text-accent-700"
          >
            Browse the collection
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
