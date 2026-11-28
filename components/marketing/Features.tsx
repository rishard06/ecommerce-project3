import React from "react";
import {
  ArrowUpRight,
  CheckCircle,
  Headphones,
  ShoppingBag,
  Star,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    title: "Premium quality",
    description:
      "Made with materials chosen to last, not to hit a price point.",
    icon: <Star className="size-7" aria-hidden="true" />,
  },
  {
    title: "Fast shipping",
    description:
      "Orders leave the same day and arrive while the excitement is still fresh.",
    icon: <ShoppingBag className="size-7" aria-hidden="true" />,
  },
  {
    title: "24/7 support",
    description:
      "A real person, around the clock, who can actually solve the problem.",
    icon: <Headphones className="size-7" aria-hidden="true" />,
  },
  {
    title: "30-day returns",
    description:
      "Change your mind within a month — no forms, no interrogation.",
    icon: <CheckCircle className="size-7" aria-hidden="true" />,
  },
];

/**
 * Catalog bento tile t4: the promise row.
 *
 * The homepage shows the lead promise (quality) at bento scale; the full
 * feature set stays available to the section for future surfaces.
 */
const promise = features[0];

export default function Features() {
  return (
    <article
      data-tile="t4"
      className="bento-card col-span-2 flex items-center gap-5 overflow-clip rounded-[1.25rem] border border-line bg-panel-2 p-5 max-[540px]:col-span-1 max-[540px]:flex-col max-[540px]:items-start"
    >
      <span className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-action/15 text-accent-text">
        {promise.icon}
      </span>

      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold tracking-[0.22em] text-gray-tertiary uppercase">
          {promise.title}
        </p>
        <h3 className="bento-card__title mt-1 font-display text-[22px] font-semibold tracking-[-0.02em] text-gray-primary">
          Why shop with us
        </h3>
        <p className="mt-1 max-w-[34ch] text-xs leading-relaxed text-gray-tertiary">
          {promise.description}
        </p>
      </div>

      <span
        aria-hidden="true"
        className="ml-auto grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-gray-secondary max-[540px]:ml-0"
      >
        <ArrowUpRight className="size-3.5" />
      </span>
    </article>
  );
}
