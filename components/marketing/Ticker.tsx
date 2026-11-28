"use client";

import { Fragment, useState } from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

export type TickerProps = {
  /** Repeating phrases. The section owns the copy; the band owns the motion. */
  items: readonly string[];
  /** Accessible name for the band. The moving copy itself is decorative. */
  label?: string;
  className?: string;
};

/**
 * Direction C ticker band.
 *
 * The track carries two identical copies and travels exactly `-50%`, so copy
 * two lands where copy one began and the seam is invisible. The moving
 * viewport is decorative (`aria-hidden`), matching the mockup; the adjacent
 * Pause/Play control owns the motion for keyboard and low-vision users, and a
 * polite status announces each change instead of `aria-pressed` (the label
 * already toggles, so a pressed state would be read twice).
 *
 * Whether the loop runs is a CSS decision: `app/globals.css` declares the
 * animation only inside `prefers-reduced-motion: no-preference`, so a reduced
 * motion visitor sees the band frozen at its readable starting position.
 */
export default function Ticker({
  items,
  label = "Store highlights",
  className,
}: TickerProps) {
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  if (items.length === 0) return null;

  function toggle() {
    const next = !paused;
    setPaused(next);
    setAnnouncement(next ? "Highlights paused" : "Highlights playing");
  }

  return (
    <section aria-label={label} className={cn("ticker", className)}>
      <div className="overflow-clip" aria-hidden="true">
        <div className="ticker-track" data-paused={paused ? "true" : undefined}>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-9 pr-9">
              {items.map((item, index) => (
                <Fragment key={`${copy}-${index}`}>
                  <span className="ticker-mark">///</span>
                  <span className="whitespace-nowrap">{item}</span>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? "Play highlights" : "Pause highlights"}
        className="press absolute right-4 top-1/2 inline-flex h-11 min-w-11 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full border border-line-strong bg-background/85 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink-2 hover:border-accent-text/60 hover:text-accent-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {paused ? (
          <Play className="size-4" aria-hidden="true" />
        ) : (
          <Pause className="size-4" aria-hidden="true" />
        )}
        <span>{paused ? "Play" : "Pause"}</span>
      </button>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
