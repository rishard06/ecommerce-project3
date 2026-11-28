import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Direction C craft band: the mockup's split panel (art left, story right)
 * closing the homepage. The art slot reserves its box with `aspect-ratio`, so
 * a late image decode cannot shift the copy; the ring is decorative only.
 */
export default function CraftBand() {
  return (
    <section aria-labelledby="craft-heading" className="shell mt-16">
      <div className="grid overflow-clip border-y border-line bg-[linear-gradient(120deg,var(--panel),var(--panel-2))] min-[981px]:grid-cols-[0.9fr_1.1fr]">
        <div className="relative aspect-[4/3] overflow-clip border-b border-line min-[981px]:aspect-auto min-[981px]:min-h-[380px] min-[981px]:border-r min-[981px]:border-b-0">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(70%_70%_at_40%_50%,var(--action),transparent_70%)] opacity-20"
          />
          <Image
            src="/landing/craft.webp"
            alt="Leafy green plant in a dark bowl planter resting on a tall black metal stand"
            fill
            sizes="(min-width: 981px) 45vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-center px-6 py-9 min-[981px]:px-12 min-[981px]:py-[52px]">
          <p className="text-[10.5px] font-semibold tracking-[0.22em] text-gray-tertiary uppercase">
            Our craft
          </p>
          <h2
            id="craft-heading"
            className="mt-3 mb-4 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.03] font-semibold tracking-[-0.035em] text-gray-primary"
          >
            Made to be kept,
            <br />
            <em className="italic text-accent-text">not replaced.</em>
          </h2>
          <p className="mb-2.5 max-w-[42ch] text-sm leading-relaxed text-gray-secondary">
            We pick materials that age well and joints that hold — the
            unglamorous decisions that decide whether something lasts a year
            or a decade.
          </p>
          <p className="max-w-[42ch] text-sm leading-relaxed text-gray-secondary">
            If it can&apos;t be repaired, we don&apos;t sell it. That&apos;s the
            whole philosophy.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-5">
            <Link
              href="/products"
              className="group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-action bg-action px-5 text-[13px] font-bold text-action-foreground transition-[background-color,transform] duration-200 ease-out-quart hover:bg-action-hover active:scale-[0.975] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Browse the collection
              <ArrowRight
                data-icon="inline-end"
                className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
